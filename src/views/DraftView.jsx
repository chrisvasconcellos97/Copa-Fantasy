import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGame } from '../hooks/useGame';
import { usePlayers } from '../hooks/usePlayers';
import { useDraft } from '../hooks/useDraft';
import { useNotifications } from '../hooks/useNotifications';
import { supabase } from '../lib/supabase';
import { FALLBACK_POTS } from '../lib/constants';
import { getSnakeOrder, getCurrentPicker } from '../lib/draft';
import TeamCard from '../components/TeamCard';
import ConfirmBar from '../components/ConfirmBar';
import SnakeOrderBar from '../components/SnakeOrderBar';
import HostDashboard from '../components/HostDashboard';
import PokeToast from '../components/PokeToast';
import SquadBuilder from '../components/SquadBuilder';
import PlayerCard from '../components/PlayerCard';
import CaptainGrid from '../components/CaptainGrid';

const TOTAL_ROUNDS = 8;

function getSession() {
  try {
    return JSON.parse(localStorage.getItem('copa_session') || '{}');
  } catch {
    return {};
  }
}

export default function DraftView() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const { game, loading: gameLoading } = useGame(gameId);
  const { players, loading: playersLoading } = usePlayers(gameId);
  const { picks, loading: picksLoading } = useDraft(gameId);
  const session = getSession();
  const myPlayerId = session.playerId;
  const isHost = !!session.hostToken;

  const { showPoke, dismissPoke, pokeMessage } = useNotifications(myPlayerId);

  // Teams from DB or fallback
  const [teams, setTeams] = useState([]);
  const [teamsLoading, setTeamsLoading] = useState(true);

  // Player selection state
  const [squadPlayers, setSquadPlayers] = useState({}); // teamApiId -> players[]
  const [activeTeamTab, setActiveTeamTab] = useState(null);
  const [selectedPlayers, setSelectedPlayers] = useState([]); // saved player_picks
  const [tempSelectedPlayers, setTempSelectedPlayers] = useState([]); // current tab selections

  // Captain state
  const [captainPickId, setCaptainPickId] = useState(null);
  const [savedCaptain, setSavedCaptain] = useState(null);

  // Team draft state
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [advancingPhase, setAdvancingPhase] = useState(false);

  // Load teams
  useEffect(() => {
    async function loadTeams() {
      setTeamsLoading(true);
      const { data, error } = await supabase.from('teams').select('*');
      if (!error && data && data.length > 0) {
        setTeams(data);
      } else {
        // Build fallback teams from FALLBACK_POTS
        const fallback = [];
        let apiId = 1;
        for (const [pot, names] of Object.entries(FALLBACK_POTS)) {
          names.forEach((name) => {
            fallback.push({ api_id: apiId++, name, logo_url: null, pot: Number(pot) });
          });
        }
        setTeams(fallback);
      }
      setTeamsLoading(false);
    }
    loadTeams();
  }, []);

  // Load existing player_picks
  useEffect(() => {
    if (!gameId || !myPlayerId) return;
    async function loadPlayerPicks() {
      const { data } = await supabase
        .from('player_picks')
        .select('*')
        .eq('game_id', gameId)
        .eq('game_player_id', myPlayerId);
      if (data) setSelectedPlayers(data);
    }
    loadPlayerPicks();
  }, [gameId, myPlayerId, game?.status]);

  // Load captain pick
  useEffect(() => {
    if (!gameId || !myPlayerId) return;
    async function loadCaptain() {
      const { data } = await supabase
        .from('captain_picks')
        .select('*')
        .eq('game_id', gameId)
        .eq('game_player_id', myPlayerId)
        .single();
      if (data) setSavedCaptain(data.player_api_id);
    }
    loadCaptain();
  }, [gameId, myPlayerId, game?.status]);

  // Load squad players for a team
  async function loadSquadForTeam(teamApiId) {
    if (squadPlayers[teamApiId]) return;
    const { data } = await supabase
      .from('players')
      .select('*')
      .eq('team_api_id', teamApiId);
    setSquadPlayers((prev) => ({ ...prev, [teamApiId]: data || [] }));
  }

  // Navigate on terminal status
  useEffect(() => {
    if (!game) return;
    if (game.status === 'tournament' || game.status === 'complete') {
      navigate(`/leaderboard/${gameId}`);
    }
  }, [game, gameId, navigate]);

  // Set active team tab when entering selecting_players phase
  useEffect(() => {
    if (game?.status === 'selecting_players' && myTeamPicks.length > 0 && !activeTeamTab) {
      const firstTeam = myTeamPicks[0]?.team_api_id;
      setActiveTeamTab(firstTeam);
      loadSquadForTeam(firstTeam);
    }
  }, [game?.status, picks, activeTeamTab]);

  const currentPickerIdx = getCurrentPicker(picks, players, TOTAL_ROUNDS);
  const currentPicker = players[currentPickerIdx];
  const isMyTurn = currentPicker?.id === myPlayerId;

  const myTeamPicks = picks.filter((p) => p.game_player_id === myPlayerId);
  const takenTeamIds = new Set(picks.map((p) => p.team_api_id));

  const teamMap = {};
  teams.forEach((t) => { teamMap[t.api_id] = t; });

  const pickerPlayerMap = {};
  picks.forEach((pick) => {
    const player = players.find((pl) => pl.id === pick.game_player_id);
    if (player) pickerPlayerMap[pick.team_api_id] = player.player_name;
  });

  // ── Team draft ──
  async function handleConfirmPick() {
    if (!selectedTeam || !isMyTurn || submitting) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from('draft_picks').insert({
        game_id: gameId,
        game_player_id: myPlayerId,
        pick_number: picks.length,
        team_api_id: selectedTeam.api_id,
      });
      if (error) throw error;
      setSelectedTeam(null);
    } catch (err) {
      console.error('Pick error', err);
    } finally {
      setSubmitting(false);
    }
  }

  // ── Poke ──
  async function handlePoke(player) {
    try {
      await supabase.from('notifications').insert({
        game_player_id: player.id,
        type: 'poke',
        message: `Hey ${player.player_name}, it's your turn to pick!`,
        read: false,
      });
    } catch (err) {
      console.error('Poke error', err);
    }
  }

  // ── Phase advance (host only) ──
  async function advancePhase() {
    if (!isHost || advancingPhase) return;
    setAdvancingPhase(true);
    const nextStatus =
      game.status === 'drafting_teams'
        ? 'selecting_players'
        : game.status === 'selecting_players'
        ? 'selecting_captain'
        : game.status === 'selecting_captain'
        ? 'tournament'
        : null;
    if (nextStatus) {
      await supabase.from('games').update({ status: nextStatus }).eq('id', gameId);
    }
    setAdvancingPhase(false);
  }

  // ── Player picks for active team tab ──
  const activeTeamPlayers = activeTeamTab ? (squadPlayers[activeTeamTab] || []) : [];
  const picksForActiveTeam = selectedPlayers.filter((p) => p.team_api_id === activeTeamTab);
  const tempForActiveTeam = tempSelectedPlayers.filter((p) => p.team_api_id === activeTeamTab);

  function isPlayerSelected(playerApiId) {
    return (
      selectedPlayers.some((p) => p.player_api_id === playerApiId) ||
      tempSelectedPlayers.some((p) => p.player_api_id === playerApiId)
    );
  }

  function togglePlayerSelect(player) {
    const alreadySaved = selectedPlayers.some((p) => p.player_api_id === player.api_id);
    if (alreadySaved) return; // can't deselect saved picks
    const alreadyTemp = tempSelectedPlayers.some((p) => p.player_api_id === player.api_id);
    const totalForTeam = picksForActiveTeam.length + tempForActiveTeam.length;
    if (alreadyTemp) {
      setTempSelectedPlayers((prev) => prev.filter((p) => p.player_api_id !== player.api_id));
    } else if (totalForTeam < 3) {
      setTempSelectedPlayers((prev) => [
        ...prev,
        { player_api_id: player.api_id, team_api_id: activeTeamTab, game_player_id: myPlayerId },
      ]);
    }
  }

  async function savePlayerPicks() {
    if (tempSelectedPlayers.length === 0) return;
    setSubmitting(true);
    try {
      const toInsert = tempSelectedPlayers.map((p) => ({
        game_id: gameId,
        game_player_id: myPlayerId,
        player_api_id: p.player_api_id,
        team_api_id: p.team_api_id,
      }));
      const { data, error } = await supabase.from('player_picks').insert(toInsert).select();
      if (error) throw error;
      setSelectedPlayers((prev) => [...prev, ...(data || [])]);
      setTempSelectedPlayers([]);
    } catch (err) {
      console.error('Save picks error', err);
    } finally {
      setSubmitting(false);
    }
  }

  // ── Captain ──
  async function saveCaptain(player) {
    setCaptainPickId(player.api_id);
    try {
      // Upsert via delete+insert
      await supabase
        .from('captain_picks')
        .delete()
        .eq('game_id', gameId)
        .eq('game_player_id', myPlayerId);
      await supabase.from('captain_picks').insert({
        game_id: gameId,
        game_player_id: myPlayerId,
        player_api_id: player.api_id,
      });
      setSavedCaptain(player.api_id);
    } catch (err) {
      console.error('Captain error', err);
    }
  }

  // ── All my players (for captain grid) ──
  const allMyPlayerApiIds = [...new Set(selectedPlayers.map((p) => p.player_api_id))];
  const allMyPlayers = allMyPlayerApiIds
    .map((apiId) => {
      for (const arr of Object.values(squadPlayers)) {
        const found = arr.find((pl) => pl.api_id === apiId);
        if (found) return found;
      }
      return { api_id: apiId, name: apiId, position: '', number: null, photo_url: null };
    })
    .filter(Boolean);

  // Preload squad players for captain phase
  useEffect(() => {
    if (game?.status === 'selecting_captain') {
      myTeamPicks.forEach((pick) => loadSquadForTeam(pick.team_api_id));
    }
  }, [game?.status]);

  if (gameLoading || playersLoading || teamsLoading || picksLoading) {
    return (
      <div className="page loading-page">
        <div className="spinner" />
        <span>Loading draft...</span>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="page" style={{ textAlign: 'center' }}>
        <p className="text-muted">Game not found.</p>
      </div>
    );
  }

  // ════════════ PHASE: drafting_teams ════════════
  if (game.status === 'drafting_teams') {
    const potGroups = [1, 2, 3, 4].map((pot) => ({
      pot,
      teams: teams.filter((t) => t.pot === pot || (!t.pot && pot === 1)),
    }));

    const draftComplete = picks.length >= players.length * TOTAL_ROUNDS;

    return (
      <div className="page page-wide">
        {showPoke && <PokeToast message={pokeMessage} onDismiss={dismissPoke} />}

        <div className="flex items-center justify-between" style={{ marginBottom: '1rem' }}>
          <h1 className="title">Team Draft</h1>
          <div className="flex gap-1 items-center">
            <span className="badge badge-muted">Pick #{picks.length + 1}</span>
            {isHost && (
              <button
                className="btn btn-sm btn-secondary"
                onClick={advancePhase}
                disabled={advancingPhase}
              >
                {advancingPhase ? '...' : 'Advance Phase →'}
              </button>
            )}
          </div>
        </div>

        <SnakeOrderBar
          players={players}
          currentPickerIndex={currentPickerIdx}
          myPlayerId={myPlayerId}
        />

        {isMyTurn ? (
          <div className="badge badge-gold" style={{ marginBottom: '1rem', display: 'inline-flex' }}>
            ⏳ Your turn to pick!
          </div>
        ) : currentPicker ? (
          <div className="badge badge-muted" style={{ marginBottom: '1rem', display: 'inline-flex' }}>
            Waiting for {currentPicker.player_name}...
          </div>
        ) : draftComplete ? (
          <div className="badge badge-green" style={{ marginBottom: '1rem', display: 'inline-flex' }}>
            ✓ Draft Complete
          </div>
        ) : null}

        <div style={{ display: 'grid', gridTemplateColumns: isHost ? '1fr 300px' : '1fr', gap: '1.25rem' }}>
          <div>
            <SquadBuilder picks={picks} teams={teams} myPlayerId={myPlayerId} />
            <div style={{ marginTop: '1.25rem' }}>
              {potGroups.map(({ pot, teams: potTeams }) => (
                <div key={pot} className="pot-group">
                  <div className="pot-label">Pot {pot}</div>
                  <div className="grid-4">
                    {potTeams.map((team) => {
                      const isTaken = takenTeamIds.has(team.api_id);
                      const takenBy = isTaken ? pickerPlayerMap[team.api_id] : null;
                      return (
                        <TeamCard
                          key={team.api_id}
                          team={team}
                          selected={selectedTeam?.api_id === team.api_id}
                          taken={isTaken}
                          takenBy={takenBy}
                          onClick={isMyTurn ? setSelectedTeam : undefined}
                          disabled={!isMyTurn}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {isHost && (
            <div>
              <HostDashboard
                players={players}
                picks={picks}
                currentPickerIndex={currentPickerIdx}
                onPoke={handlePoke}
                teams={teams}
              />
            </div>
          )}
        </div>

        {isMyTurn && (
          <ConfirmBar
            selectedTeam={selectedTeam}
            onConfirm={handleConfirmPick}
            onCancel={() => setSelectedTeam(null)}
          />
        )}

        {isMyTurn && selectedTeam && <div style={{ height: '80px' }} />}
      </div>
    );
  }

  // ════════════ PHASE: selecting_players ════════════
  if (game.status === 'selecting_players') {
    return (
      <div className="page page-wide">
        {showPoke && <PokeToast message={pokeMessage} onDismiss={dismissPoke} />}

        <div className="flex items-center justify-between" style={{ marginBottom: '1rem' }}>
          <h1 className="title">Pick Your Players</h1>
          <div className="flex gap-1 items-center">
            <span className="badge badge-muted">
              {selectedPlayers.length}/{myTeamPicks.length * 3} players
            </span>
            {isHost && (
              <button
                className="btn btn-sm btn-secondary"
                onClick={advancePhase}
                disabled={advancingPhase}
              >
                {advancingPhase ? '...' : 'Advance Phase →'}
              </button>
            )}
          </div>
        </div>

        <p className="text-muted" style={{ marginBottom: '1rem' }}>
          Select 3 players from each of your 8 teams.
        </p>

        <div className="tab-row">
          {myTeamPicks.map((pick) => {
            const team = teamMap[pick.team_api_id];
            const pickedCount = selectedPlayers.filter((p) => p.team_api_id === pick.team_api_id).length +
              tempSelectedPlayers.filter((p) => p.team_api_id === pick.team_api_id).length;
            return (
              <button
                key={pick.team_api_id}
                className={`tab${activeTeamTab === pick.team_api_id ? ' active' : ''}`}
                onClick={() => {
                  setActiveTeamTab(pick.team_api_id);
                  loadSquadForTeam(pick.team_api_id);
                }}
              >
                {team?.name || pick.team_api_id}
                {' '}
                <span style={{ opacity: 0.6 }}>({pickedCount}/3)</span>
              </button>
            );
          })}
        </div>

        {activeTeamTab && (
          <>
            <div className="flex items-center justify-between" style={{ marginBottom: '0.75rem' }}>
              <span className="label">
                {teamMap[activeTeamTab]?.name} — Pick 3 players
              </span>
              {tempSelectedPlayers.some((p) => p.team_api_id === activeTeamTab) && (
                <button
                  className="btn btn-primary btn-sm"
                  onClick={savePlayerPicks}
                  disabled={submitting}
                >
                  {submitting ? 'Saving...' : 'Save Picks'}
                </button>
              )}
            </div>

            {!squadPlayers[activeTeamTab] ? (
              <div className="loading-page"><div className="spinner" /></div>
            ) : activeTeamPlayers.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
                No players found for this team.
              </div>
            ) : (
              <div className="grid-4">
                {activeTeamPlayers.map((player) => {
                  const sel = isPlayerSelected(player.api_id);
                  return (
                    <PlayerCard
                      key={player.api_id}
                      player={player}
                      selected={sel}
                      onClick={() => togglePlayerSelect(player)}
                      showPosition
                    />
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  // ════════════ PHASE: selecting_captain ════════════
  if (game.status === 'selecting_captain') {
    return (
      <div className="page">
        {showPoke && <PokeToast message={pokeMessage} onDismiss={dismissPoke} />}

        <div className="flex items-center justify-between" style={{ marginBottom: '1rem' }}>
          <h1 className="title">Pick Your Captain</h1>
          <div className="flex gap-1 items-center">
            {isHost && (
              <button
                className="btn btn-sm btn-secondary"
                onClick={advancePhase}
                disabled={advancingPhase}
              >
                {advancingPhase ? '...' : 'Start Tournament →'}
              </button>
            )}
          </div>
        </div>

        <p className="text-muted" style={{ marginBottom: '1.25rem' }}>
          Your captain scores double points throughout the tournament.
        </p>

        {savedCaptain && (
          <div className="badge badge-gold" style={{ marginBottom: '1rem', display: 'inline-flex' }}>
            👑 Captain saved!
          </div>
        )}

        <CaptainGrid
          playerPicks={allMyPlayers}
          captainPickId={captainPickId || savedCaptain}
          onSelectCaptain={saveCaptain}
        />
      </div>
    );
  }

  // Fallback
  return (
    <div className="page loading-page">
      <div className="spinner" />
      <span>Loading...</span>
    </div>
  );
}
