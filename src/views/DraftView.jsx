import React, { useState, useEffect, useCallback } from 'react';
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
import ConfirmBar from '../components/ConfirmBar';
import SnakeOrderBar from '../components/SnakeOrderBar';
import HostDashboard from '../components/HostDashboard';
import PokeToast from '../components/PokeToast';
import SquadBuilder from '../components/SquadBuilder';
import PlayerCard from '../components/PlayerCard';
import CaptainGrid from '../components/CaptainGrid';

const TEAMS_PER_PLAYER = 8;

// Build team objects from FALLBACK_POTS
function buildFallbackTeams() {
  const teams = [];
  for (const [pot, names] of Object.entries(FALLBACK_POTS)) {
    for (const name of names) {
      teams.push({
        api_id: name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''),
        name,
        logo_url: null,
        pot: parseInt(pot),
      });
    }
  }
  return teams;
}

export default function DraftView() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const session = getSession();
  const myPlayerId = session?.playerId;
  const isHost = Boolean(session?.hostToken);

  const { game, loading: gameLoading } = useGame(gameId);
  const { players, loading: playersLoading } = usePlayers(gameId);
  const { picks, loading: picksLoading } = useDraft(gameId);
  const { showPoke, dismissPoke, pokeMessage } = useNotifications(myPlayerId);

  const [teams, setTeams] = useState([]);
  const [teamsLoading, setTeamsLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [confirming, setConfirming] = useState(false);

  // Player selection state
  const [activeTeamTab, setActiveTeamTab] = useState(null);
  const [squadPlayers, setSquadPlayers] = useState({}); // teamApiId -> players[]
  const [selectedPlayers, setSelectedPlayers] = useState([]); // player_api_ids
  const [playerPicksSaved, setPlayerPicksSaved] = useState(false);
  const [savingPlayers, setSavingPlayers] = useState(false);

  // Captain state
  const [captainPickId, setCaptainPickId] = useState(null);
  const [savingCaptain, setSavingCaptain] = useState(false);
  const [myPlayerPicks, setMyPlayerPicks] = useState([]);

  // Load teams from DB
  useEffect(() => {
    async function loadTeams() {
      const { data, error } = await supabase.from('teams').select('*').order('pot');
      if (error || !data || data.length === 0) {
        setTeams(buildFallbackTeams());
      } else {
        setTeams(data);
      }
      setTeamsLoading(false);
    }
    loadTeams();
  }, []);

  // Navigate when tournament/complete
  useEffect(() => {
    if (game && (game.status === 'tournament' || game.status === 'complete')) {
      navigate(`/leaderboard/${gameId}`, { replace: true });
    }
  }, [game, gameId, navigate]);

  // Load my existing player picks
  useEffect(() => {
    if (!myPlayerId || !gameId) return;
    supabase
      .from('player_picks')
      .select('*')
      .eq('game_id', gameId)
      .eq('game_player_id', myPlayerId)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setSelectedPlayers(data.map((p) => p.player_api_id));
          setPlayerPicksSaved(true);
          setMyPlayerPicks(data);
        }
      });
  }, [myPlayerId, gameId]);

  // Load my captain pick
  useEffect(() => {
    if (!myPlayerId || !gameId) return;
    supabase
      .from('captain_picks')
      .select('*')
      .eq('game_id', gameId)
      .eq('game_player_id', myPlayerId)
      .single()
      .then(({ data }) => {
        if (data) setCaptainPickId(data.player_api_id);
      });
  }, [myPlayerId, gameId]);

  // Load players for a team
  async function loadTeamPlayers(teamApiId) {
    if (squadPlayers[teamApiId]) return;
    const { data } = await supabase
      .from('players')
      .select('*')
      .eq('team_api_id', teamApiId)
      .order('position');
    setSquadPlayers((prev) => ({ ...prev, [teamApiId]: data || [] }));
  }

  // Draft order calculation
  const currentPickerIdx = getCurrentPicker(picks, players, TEAMS_PER_PLAYER);
  const currentPicker = players[currentPickerIdx];
  const isMyTurn = currentPicker?.id === myPlayerId;
  const takenMap = {}; // teamApiId -> playerName
  picks.forEach((pick) => {
    const gp = players.find((p) => p.id === pick.game_player_id);
    takenMap[pick.team_api_id] = gp?.player_name || 'Someone';
  });

  const myPickCount = picks.filter((p) => p.game_player_id === myPlayerId).length;
  const draftComplete = currentPickerIdx === -1;

  // Host advance phase
  async function advancePhase() {
    const next = {
      drafting_teams: 'selecting_players',
      selecting_players: 'selecting_captain',
      selecting_captain: 'tournament',
    };
    const nextStatus = next[game?.status];
    if (!nextStatus) return;
    await supabase.from('games').update({ status: nextStatus }).eq('id', gameId);
  }

  // Confirm team pick
  async function handleConfirmPick() {
    if (!selectedTeam || !isMyTurn || confirming) return;
    setConfirming(true);
    const pickNumber = picks.length + 1;
    const { error } = await supabase.from('draft_picks').insert({
      game_id: gameId,
      game_player_id: myPlayerId,
      pick_number: pickNumber,
      team_api_id: selectedTeam.api_id,
    });
    if (error) console.error(error);
    setSelectedTeam(null);
    setConfirming(false);
  }

  // Poke player
  async function handlePoke(playerId) {
    await supabase.from('notifications').insert({
      game_player_id: playerId,
      type: 'poke',
      message: "It's your turn to pick!",
      read: false,
    });
  }

  // Toggle player selection (max 3 per team)
  function togglePlayerSelection(teamApiId, playerApiId) {
    setSelectedPlayers((prev) => {
      if (prev.includes(playerApiId)) {
        return prev.filter((id) => id !== playerApiId);
      }
      // Count how many already selected from this team
      const teamPlayers = squadPlayers[teamApiId] || [];
      const teamPlayerIds = teamPlayers.map((p) => p.api_id);
      const countForTeam = prev.filter((id) => teamPlayerIds.includes(id)).length;
      if (countForTeam >= 3) return prev;
      return [...prev, playerApiId];
    });
  }

  // Save player picks
  async function savePlayerPicks() {
    setSavingPlayers(true);
    const myDraftPicks = picks.filter((p) => p.game_player_id === myPlayerId);

    // Validate: 3 players per team
    for (const dp of myDraftPicks) {
      const teamPlayers = squadPlayers[dp.team_api_id] || [];
      const teamPlayerIds = teamPlayers.map((p) => p.api_id);
      const count = selectedPlayers.filter((id) => teamPlayerIds.includes(id)).length;
      if (count !== 3) {
        alert(`Please select exactly 3 players from each team (${dp.team_api_id} has ${count})`);
        setSavingPlayers(false);
        return;
      }
    }

    // Delete existing picks and re-insert
    await supabase
      .from('player_picks')
      .delete()
      .eq('game_id', gameId)
      .eq('game_player_id', myPlayerId);

    const inserts = [];
    for (const dp of myDraftPicks) {
      const teamPlayers = squadPlayers[dp.team_api_id] || [];
      const teamPlayerIds = teamPlayers.map((p) => p.api_id);
      const picked = selectedPlayers.filter((id) => teamPlayerIds.includes(id));
      for (const pid of picked) {
        inserts.push({
          game_id: gameId,
          game_player_id: myPlayerId,
          player_api_id: pid,
          team_api_id: dp.team_api_id,
        });
      }
    }

    const { data, error } = await supabase.from('player_picks').insert(inserts).select();
    if (!error) {
      setPlayerPicksSaved(true);
      setMyPlayerPicks(data || []);
    }
    setSavingPlayers(false);
  }

  // Save captain
  async function saveCaptain(playerApiId) {
    setSavingCaptain(true);
    await supabase
      .from('captain_picks')
      .delete()
      .eq('game_id', gameId)
      .eq('game_player_id', myPlayerId);

    const { error } = await supabase.from('captain_picks').insert({
      game_id: gameId,
      game_player_id: myPlayerId,
      player_api_id: playerApiId,
    });
    if (!error) setCaptainPickId(playerApiId);
    setSavingCaptain(false);
  }

  if (gameLoading || playersLoading || picksLoading || teamsLoading) {
    return (
      <div className="loading-page">
        <div className="loading-spinner" />
        <span>Loading draft...</span>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="page">
        <div className="empty-state">
          <div className="empty-state__icon">🔍</div>
          <div className="empty-state__title">Game not found</div>
        </div>
      </div>
    );
  }

  const status = game.status;

  // Group teams by pot for display
  const teamsByPot = {};
  teams.forEach((t) => {
    const pot = t.pot || 1;
    if (!teamsByPot[pot]) teamsByPot[pot] = [];
    teamsByPot[pot].push(t);
  });

  const myDraftPicks = picks.filter((p) => p.game_player_id === myPlayerId);
  const myDraftTeams = myDraftPicks
    .map((p) => teams.find((t) => t.api_id === p.team_api_id))
    .filter(Boolean);

  // Compute captain-eligible players
  const captainEligiblePlayers = myPlayerPicks.map((pp) => {
    // Try to find full player data
    const allTeamPlayers = Object.values(squadPlayers).flat();
    const full = allTeamPlayers.find((p) => p.api_id === pp.player_api_id);
    return full || { api_id: pp.player_api_id, player_api_id: pp.player_api_id, name: pp.player_api_id };
  });

  return (
    <div className="page" style={{ paddingBottom: selectedTeam ? 100 : 24 }}>
      {showPoke && <PokeToast message={pokeMessage} onDismiss={dismissPoke} />}

      {/* Phase banner */}
      <div className="phase-banner">
        {status === 'drafting_teams' && '🏆 Team Draft — Pick your teams!'}
        {status === 'selecting_players' && '👤 Player Selection — Choose 3 players per team'}
        {status === 'selecting_captain' && '👑 Captain Selection — Choose your captain'}
      </div>

      {/* ========== DRAFTING TEAMS ========== */}
      {status === 'drafting_teams' && (
        <>
          <SnakeOrderBar
            players={players}
            currentPickerIndex={currentPickerIdx}
            myPlayerId={myPlayerId}
          />

          <div className="flex gap-4 mt-4" style={{ flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 280 }}>
              {isMyTurn && !draftComplete && (
                <div className="phase-banner" style={{ marginBottom: 16 }}>
                  🎯 It's your turn! Pick a team.
                </div>
              )}
              {!isMyTurn && !draftComplete && (
                <div className="phase-banner" style={{ marginBottom: 16, color: 'var(--text-muted)', borderColor: 'var(--border)' }}>
                  ⏳ Waiting for {currentPicker?.player_name}...
                </div>
              )}
              {draftComplete && (
                <div className="phase-banner" style={{ marginBottom: 16 }}>
                  ✅ Team draft complete!
                </div>
              )}

              {[1, 2, 3, 4].map((pot) => {
                const potTeams = teamsByPot[pot] || [];
                if (potTeams.length === 0) return null;
                return (
                  <div key={pot} className="pot-section">
                    <div className="pot-header">
                      <span className="pot-label">Pot {pot}</span>
                      <div className="divider" style={{ flex: 1, margin: '0 12px' }} />
                    </div>
                    <div className="grid grid-4" style={{ gap: 10 }}>
                      {potTeams.map((team) => {
                        const taken = Boolean(takenMap[team.api_id]);
                        const isSelected = selectedTeam?.api_id === team.api_id;
                        return (
                          <TeamCard
                            key={team.api_id}
                            team={team}
                            selected={isSelected}
                            taken={taken}
                            takenBy={takenMap[team.api_id]}
                            onClick={isMyTurn && !draftComplete ? setSelectedTeam : undefined}
                            disabled={!isMyTurn || draftComplete}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ width: 280, flexShrink: 0 }}>
              <SquadBuilder picks={picks} teams={teams} myPlayerId={myPlayerId} />
              {isHost && (
                <div className="mt-4">
                  <HostDashboard
                    players={players}
                    picks={picks}
                    currentPickerIndex={currentPickerIdx}
                    onPoke={handlePoke}
                    teams={teams}
                  />
                  {draftComplete && (
                    <button
                      className="btn btn-primary btn-block mt-4"
                      onClick={advancePhase}
                    >
                      Advance to Player Selection →
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <ConfirmBar
            selectedTeam={selectedTeam}
            onConfirm={handleConfirmPick}
            onCancel={() => setSelectedTeam(null)}
          />
        </>
      )}

      {/* ========== SELECTING PLAYERS ========== */}
      {status === 'selecting_players' && (
        <div>
          <p className="text-muted text-sm mb-4">
            Select exactly 3 players from each of your {myDraftTeams.length} teams.
            {playerPicksSaved && ' ✅ Picks saved!'}
          </p>

          {/* Team tabs */}
          <div className="tab-strip">
            {myDraftTeams.map((team) => {
              const teamPlayers = squadPlayers[team.api_id] || [];
              const teamPlayerIds = teamPlayers.map((p) => p.api_id);
              const count = selectedPlayers.filter((id) => teamPlayerIds.includes(id)).length;
              return (
                <button
                  key={team.api_id}
                  className={`tab${activeTeamTab === team.api_id ? ' tab--active' : ''}`}
                  onClick={() => {
                    setActiveTeamTab(team.api_id);
                    loadTeamPlayers(team.api_id);
                  }}
                >
                  {team.name}
                  <span className="badge badge-muted" style={{ marginLeft: 6 }}>
                    {count}/3
                  </span>
                </button>
              );
            })}
          </div>

          {activeTeamTab && (
            <div>
              {!squadPlayers[activeTeamTab] ? (
                <div className="loading-page" style={{ minHeight: 200 }}>
                  <div className="loading-spinner" />
                </div>
              ) : squadPlayers[activeTeamTab].length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state__icon">👤</div>
                  <div className="empty-state__title">No players found for this team</div>
                  <p className="text-muted text-sm">Run the backfill script to load player data</p>
                </div>
              ) : (
                <div className="grid grid-4" style={{ gap: 10 }}>
                  {squadPlayers[activeTeamTab].map((player) => (
                    <PlayerCard
                      key={player.api_id}
                      player={player}
                      selected={selectedPlayers.includes(player.api_id)}
                      onClick={() => togglePlayerSelection(activeTeamTab, player.api_id)}
                      showPosition
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {!activeTeamTab && myDraftTeams.length > 0 && (
            <div className="empty-state">
              <div className="empty-state__icon">👆</div>
              <div className="empty-state__title">Select a team tab to pick players</div>
            </div>
          )}

          <div className="flex justify-between items-center mt-6" style={{ gap: 12 }}>
            <span className="text-muted text-sm">
              {selectedPlayers.length} player{selectedPlayers.length !== 1 ? 's' : ''} selected ({myDraftTeams.length * 3} needed)
            </span>
            <button
              className="btn btn-primary"
              onClick={savePlayerPicks}
              disabled={savingPlayers || selectedPlayers.length !== myDraftTeams.length * 3}
            >
              {savingPlayers ? 'Saving...' : playerPicksSaved ? '✓ Update Picks' : 'Save Picks'}
            </button>
          </div>

          {isHost && (
            <div className="card mt-6">
              <div className="card-title">Host Controls</div>
              <button className="btn btn-primary" onClick={advancePhase}>
                Advance to Captain Selection →
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========== SELECTING CAPTAIN ========== */}
      {status === 'selecting_captain' && (
        <div>
          <p className="text-muted text-sm mb-4">
            Choose your captain. Their points will be doubled! 👑
            {captainPickId && ' ✅ Captain selected!'}
          </p>

          <CaptainGrid
            playerPicks={captainEligiblePlayers}
            captainPickId={captainPickId}
            onSelectCaptain={saveCaptain}
          />

          {savingCaptain && (
            <div className="text-muted text-sm mt-2 text-center">Saving...</div>
          )}

          {isHost && (
            <div className="card mt-6">
              <div className="card-title">Host Controls</div>
              <button className="btn btn-primary" onClick={advancePhase}>
                Start Tournament →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
