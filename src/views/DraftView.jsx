import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getSession } from '../lib/session';
import { useGame } from '../hooks/useGame';
import { usePlayers } from '../hooks/usePlayers';
import { useDraft } from '../hooks/useDraft';
import { useNotifications } from '../hooks/useNotifications';
import { FALLBACK_POTS } from '../lib/constants';
import { getSnakeOrder, getCurrentPicker } from '../lib/draft';
import TeamCard from '../components/TeamCard';
import SnakeOrderBar from '../components/SnakeOrderBar';
import ConfirmBar from '../components/ConfirmBar';
import HostDashboard from '../components/HostDashboard';
import PokeToast from '../components/PokeToast';
import SquadBuilder from '../components/SquadBuilder';
import PlayerCard from '../components/PlayerCard';
import CaptainGrid from '../components/CaptainGrid';

const TEAMS_PER_PLAYER = 8;

export default function DraftView() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const session = getSession();
  const myPlayerId = session?.playerId;
  const isHost = !!session?.hostToken;

  const { game } = useGame(gameId);
  const { players } = usePlayers(gameId);
  const { picks } = useDraft(gameId);
  const { showPoke, dismissPoke, pokeMessage } = useNotifications(myPlayerId);

  // Teams from DB
  const [teams, setTeams] = useState([]);
  const [teamsLoading, setTeamsLoading] = useState(true);

  // Team draft selection
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Player picks phase
  const [squadPlayers, setSquadPlayers] = useState({}); // teamApiId -> players[]
  const [activeTeamTab, setActiveTeamTab] = useState(null);
  const [selectedPlayers, setSelectedPlayers] = useState([]); // player_api_ids already saved
  const [pendingPlayers, setPendingPlayers] = useState([]); // being selected in UI

  // Captain phase
  const [captainId, setCaptainId] = useState(null);
  const [savedCaptainId, setSavedCaptainId] = useState(null);

  // ── Load teams ──────────────────────────────────────────────────
  useEffect(() => {
    async function loadTeams() {
      setTeamsLoading(true);
      const { data } = await supabase.from('teams').select('*').order('pot');
      if (data && data.length > 0) {
        setTeams(data);
      } else {
        // Build from FALLBACK_POTS
        const fallback = [];
        Object.entries(FALLBACK_POTS).forEach(([pot, names]) => {
          names.forEach((name, idx) => {
            fallback.push({ api_id: `fallback_${pot}_${idx}`, name, pot: Number(pot), logo_url: null });
          });
        });
        setTeams(fallback);
      }
      setTeamsLoading(false);
    }
    loadTeams();
  }, []);

  // ── Load my player picks ──────────────────────────────────────
  useEffect(() => {
    if (!myPlayerId || !gameId) return;
    async function loadPlayerPicks() {
      const { data } = await supabase
        .from('player_picks')
        .select('*')
        .eq('game_id', gameId)
        .eq('game_player_id', myPlayerId);
      if (data) setSelectedPlayers(data.map((p) => String(p.player_api_id)));
    }
    loadPlayerPicks();
  }, [gameId, myPlayerId, game?.status]);

  // ── Load my captain ────────────────────────────────────────────
  useEffect(() => {
    if (!myPlayerId || !gameId) return;
    async function loadCaptain() {
      const { data } = await supabase
        .from('captain_picks')
        .select('*')
        .eq('game_id', gameId)
        .eq('game_player_id', myPlayerId)
        .maybeSingle();
      if (data) {
        setSavedCaptainId(String(data.player_api_id));
        setCaptainId(String(data.player_api_id));
      }
    }
    loadCaptain();
  }, [gameId, myPlayerId, game?.status]);

  // ── Redirect when tournament starts ───────────────────────────
  useEffect(() => {
    if (game?.status === 'tournament' || game?.status === 'complete') {
      navigate(`/leaderboard/${gameId}`, { replace: true });
    }
  }, [game?.status, gameId, navigate]);

  // ── Derived values ─────────────────────────────────────────────
  const snakeOrder = useMemo(
    () => getSnakeOrder(players, TEAMS_PER_PLAYER),
    [players]
  );

  const currentPicker = useMemo(
    () => getCurrentPicker(picks, players, TEAMS_PER_PLAYER),
    [picks, players]
  );

  const currentPickerIndex = useMemo(() => {
    if (!currentPicker) return -1;
    return players.findIndex((p) => p.id === currentPicker.id);
  }, [currentPicker, players]);

  const isMyTurn = currentPicker?.id === myPlayerId;

  const takenMap = useMemo(() => {
    const map = {};
    picks.forEach((pick) => {
      const player = players.find((p) => p.id === pick.game_player_id);
      map[String(pick.team_api_id)] = player?.player_name || 'Taken';
    });
    return map;
  }, [picks, players]);

  const myTeamPicks = picks.filter((p) => String(p.game_player_id) === String(myPlayerId));
  const myTeamApiIds = myTeamPicks.map((p) => String(p.team_api_id));

  const draftComplete = picks.length >= players.length * TEAMS_PER_PLAYER;

  // ── Load squad players for a team ─────────────────────────────
  async function loadSquadForTeam(teamApiId) {
    if (squadPlayers[teamApiId]) return;
    const { data } = await supabase
      .from('players')
      .select('*')
      .eq('team_api_id', teamApiId)
      .order('position');
    setSquadPlayers((prev) => ({ ...prev, [teamApiId]: data || [] }));
  }

  useEffect(() => {
    if (game?.status === 'selecting_players' && activeTeamTab) {
      loadSquadForTeam(activeTeamTab);
    }
  }, [activeTeamTab, game?.status]);

  useEffect(() => {
    if (game?.status === 'selecting_players' && myTeamApiIds.length > 0 && !activeTeamTab) {
      setActiveTeamTab(myTeamApiIds[0]);
    }
  }, [game?.status, myTeamApiIds.length]);

  // ── Actions ────────────────────────────────────────────────────
  async function confirmTeamPick() {
    if (!selectedTeam || !isMyTurn || submitting) return;
    setSubmitting(true);
    try {
      await supabase.from('draft_picks').insert({
        game_id: gameId,
        game_player_id: myPlayerId,
        pick_number: picks.length + 1,
        team_api_id: selectedTeam.api_id,
      });
      setSelectedTeam(null);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePoke(targetPlayerId) {
    await supabase.from('notifications').insert({
      game_player_id: targetPlayerId,
      type: 'poke',
      message: "It's your turn to pick! ⏰",
      read: false,
    });
  }

  async function advancePhase() {
    const phases = {
      drafting_teams: 'selecting_players',
      selecting_players: 'selecting_captain',
      selecting_captain: 'tournament',
    };
    const next = phases[game?.status];
    if (next) {
      await supabase.from('games').update({ status: next }).eq('id', gameId);
    }
  }

  function togglePlayerPick(player) {
    const id = String(player.api_id);
    if (selectedPlayers.includes(id)) return; // already saved
    setPendingPlayers((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function savePlayerPicks() {
    if (pendingPlayers.length === 0) return;
    const rows = pendingPlayers.map((playerApiId) => {
      const teamApiId = Object.keys(squadPlayers).find((tid) =>
        squadPlayers[tid]?.some((p) => String(p.api_id) === playerApiId)
      );
      return {
        game_id: gameId,
        game_player_id: myPlayerId,
        player_api_id: playerApiId,
        team_api_id: teamApiId || null,
      };
    });
    await supabase.from('player_picks').insert(rows);
    setSelectedPlayers((prev) => [...prev, ...pendingPlayers]);
    setPendingPlayers([]);
  }

  async function saveCaptain() {
    if (!captainId) return;
    if (savedCaptainId) {
      await supabase
        .from('captain_picks')
        .update({ player_api_id: captainId })
        .eq('game_id', gameId)
        .eq('game_player_id', myPlayerId);
    } else {
      await supabase.from('captain_picks').insert({
        game_id: gameId,
        game_player_id: myPlayerId,
        player_api_id: captainId,
      });
    }
    setSavedCaptainId(captainId);
    alert('Captain saved!');
  }

  // ── My squad players (for captain grid) ───────────────────────
  const allMyPlayers = useMemo(() => {
    const result = [];
    const allIds = [...selectedPlayers, ...pendingPlayers];
    Object.values(squadPlayers).forEach((teamPlayers) => {
      teamPlayers.forEach((p) => {
        if (allIds.includes(String(p.api_id))) result.push(p);
      });
    });
    return result;
  }, [squadPlayers, selectedPlayers, pendingPlayers]);

  if (!game) {
    return (
      <div className="page">
        <div className="loading">
          <div className="spinner" />
          Loading draft...
        </div>
      </div>
    );
  }

  // ── PHASE: drafting_teams ──────────────────────────────────────
  if (game.status === 'drafting_teams') {
    return (
      <div className="page" style={{ paddingBottom: 80 }}>
        {showPoke && <PokeToast message={pokeMessage} onDismiss={dismissPoke} />}

        <div className="container">
          {/* Phase banner */}
          <div className="phase-banner mb-4">
            <div className="phase-banner-title">Team Draft</div>
            <div className="phase-banner-sub">
              {isMyTurn
                ? "🟢 It's your turn to pick!"
                : `Waiting for ${currentPicker?.player_name || '...'}...`}
            </div>
          </div>

          {/* Snake order bar */}
          <div className="mb-4">
            <SnakeOrderBar
              players={players}
              currentPickerIndex={currentPickerIndex}
              myPlayerId={myPlayerId}
            />
          </div>

          <div className="flex gap-4" style={{ alignItems: 'flex-start' }}>
            {/* Main: team grid */}
            <div style={{ flex: 1 }}>
              <div className="mb-3 flex justify-between items-center">
                <span className="text-sm text-muted">
                  Pick {picks.length + 1} of {players.length * TEAMS_PER_PLAYER}
                </span>
                {draftComplete && (
                  <span className="badge badge-success">Draft Complete</span>
                )}
              </div>

              {teamsLoading ? (
                <div className="loading" style={{ minHeight: 200 }}>
                  <div className="spinner" />
                </div>
              ) : (
                <div className="team-grid">
                  {teams.map((team) => {
                    const takenBy = takenMap[String(team.api_id)];
                    const isTaken = !!takenBy;
                    const isSelected = selectedTeam?.api_id === team.api_id;
                    return (
                      <TeamCard
                        key={team.api_id}
                        team={team}
                        selected={isSelected}
                        taken={isTaken}
                        takenBy={takenBy}
                        disabled={!isMyTurn || draftComplete}
                        onClick={(t) => {
                          if (isMyTurn && !isTaken) {
                            setSelectedTeam(isSelected ? null : t);
                          }
                        }}
                      />
                    );
                  })}
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div style={{ width: 240, flexShrink: 0 }}>
              {/* My squad */}
              <div className="card mb-3">
                <SquadBuilder picks={picks} teams={teams} myPlayerId={myPlayerId} />
              </div>

              {/* Host dashboard */}
              {isHost && (
                <div className="mb-3">
                  <HostDashboard
                    players={players}
                    picks={picks}
                    currentPickerIndex={currentPickerIndex}
                    onPoke={handlePoke}
                    teams={teams}
                  />
                </div>
              )}

              {/* Host advance */}
              {isHost && draftComplete && (
                <button className="btn btn-gold btn-full" onClick={advancePhase}>
                  Advance → Player Picks
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Confirm bar */}
        <ConfirmBar
          selectedTeam={selectedTeam}
          onConfirm={confirmTeamPick}
          onCancel={() => setSelectedTeam(null)}
        />
      </div>
    );
  }

  // ── PHASE: selecting_players ───────────────────────────────────
  if (game.status === 'selecting_players') {
    const activeTeamObj = teams.find((t) => String(t.api_id) === String(activeTeamTab));
    const activeSquad = (activeTeamTab && squadPlayers[activeTeamTab]) || [];
    const pickedForActiveTeam = activeSquad
      .filter((p) => selectedPlayers.includes(String(p.api_id)) || pendingPlayers.includes(String(p.api_id)))
      .length;

    return (
      <div className="page">
        {showPoke && <PokeToast message={pokeMessage} onDismiss={dismissPoke} />}
        <div className="container">
          <div className="phase-banner mb-4">
            <div className="phase-banner-title">Select Players</div>
            <div className="phase-banner-sub">
              Pick 3 players from each of your 8 teams
            </div>
          </div>

          {/* Team tabs */}
          <div className="tabs mb-4">
            {myTeamApiIds.map((tid) => {
              const team = teams.find((t) => String(t.api_id) === String(tid));
              return (
                <button
                  key={tid}
                  className={`tab ${activeTeamTab === tid ? 'active' : ''}`}
                  onClick={() => setActiveTeamTab(tid)}
                >
                  {team?.name || tid}
                </button>
              );
            })}
          </div>

          {/* Active team players */}
          {activeTeamTab && (
            <div>
              <div className="flex justify-between items-center mb-3">
                <span className="font-semibold">{activeTeamObj?.name}</span>
                <span className="text-sm text-muted">{pickedForActiveTeam}/3 selected</span>
              </div>

              {activeSquad.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">👥</div>
                  <div className="empty-state-title">Loading squad...</div>
                </div>
              ) : (
                <div className="grid-4">
                  {activeSquad.map((player) => {
                    const isSaved = selectedPlayers.includes(String(player.api_id));
                    const isPending = pendingPlayers.includes(String(player.api_id));
                    const isSelected = isSaved || isPending;
                    const atLimit = pickedForActiveTeam >= 3;
                    return (
                      <PlayerCard
                        key={player.api_id}
                        player={player}
                        selected={isSelected}
                        disabled={isSaved || (!isPending && atLimit)}
                        onClick={togglePlayerPick}
                        showPosition
                      />
                    );
                  })}
                </div>
              )}

              {pendingPlayers.length > 0 && (
                <div className="mt-4 flex gap-3">
                  <button className="btn btn-gold" onClick={savePlayerPicks}>
                    Save Picks ({pendingPlayers.length})
                  </button>
                  <button className="btn btn-outline" onClick={() => setPendingPlayers([])}>
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Host advance */}
          {isHost && (
            <div className="mt-6 card">
              <div className="font-semibold mb-2">Host Controls</div>
              <button className="btn btn-gold" onClick={advancePhase}>
                Advance → Captain Pick
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── PHASE: selecting_captain ───────────────────────────────────
  if (game.status === 'selecting_captain') {
    return (
      <div className="page">
        {showPoke && <PokeToast message={pokeMessage} onDismiss={dismissPoke} />}
        <div className="container" style={{ maxWidth: 700 }}>
          <div className="phase-banner mb-4">
            <div className="phase-banner-title">Captain Pick</div>
            <div className="phase-banner-sub">
              Choose your captain — they score double points!
            </div>
          </div>

          <div className="card mb-4">
            <CaptainGrid
              playerPicks={allMyPlayers}
              captainPickId={captainId}
              onSelectCaptain={(p) => setCaptainId(String(p.api_id))}
            />
          </div>

          <div className="flex gap-3">
            <button
              className="btn btn-gold"
              onClick={saveCaptain}
              disabled={!captainId || captainId === savedCaptainId}
            >
              {savedCaptainId ? 'Update Captain' : 'Confirm Captain'}
            </button>
          </div>

          {/* Host advance */}
          {isHost && (
            <div className="mt-6 card">
              <div className="font-semibold mb-2">Host Controls</div>
              <button className="btn btn-gold" onClick={advancePhase}>
                Start Tournament →
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Fallback
  return (
    <div className="page">
      <div className="loading">
        <div className="spinner" />
        <span>Loading phase: {game.status}</span>
      </div>
    </div>
  );
}
