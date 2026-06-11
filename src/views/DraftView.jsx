import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGame } from '../hooks/useGame';
import { usePlayers } from '../hooks/usePlayers';
import { useDraft } from '../hooks/useDraft';
import { useNotifications } from '../hooks/useNotifications';
import { getSession } from '../lib/session';
import { supabase } from '../lib/supabase';
import { FALLBACK_POTS } from '../lib/constants';
import { getSnakeOrder, getCurrentPicker } from '../lib/draft';
import TeamCard from '../components/TeamCard';
import PlayerCard from '../components/PlayerCard';
import ConfirmBar from '../components/ConfirmBar';
import SnakeOrderBar from '../components/SnakeOrderBar';
import HostDashboard from '../components/HostDashboard';
import CaptainGrid from '../components/CaptainGrid';
import PokeToast from '../components/PokeToast';
import SquadBuilder from '../components/SquadBuilder';

const TOTAL_ROUNDS = 8;

export default function DraftView() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const { game, loading: gameLoading } = useGame(gameId);
  const { players, loading: playersLoading } = usePlayers(gameId);
  const { picks, loading: picksLoading } = useDraft(gameId);
  const session = getSession();
  const myPlayerId = session?.playerId;
  const isHost = session?.hostToken && game?.host_token === session?.hostToken;

  const { showPoke, dismissPoke, pokeMessage } = useNotifications(myPlayerId);

  // Team draft state
  const [teams, setTeams] = useState([]);
  const [teamsLoading, setTeamsLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Player selection state
  const [activeTeamTab, setActiveTeamTab] = useState(null);
  const [teamPlayers, setTeamPlayers] = useState({});
  const [selectedPlayerIds, setSelectedPlayerIds] = useState({}); // teamId -> [playerId]
  const [savedPlayerPicks, setSavedPlayerPicks] = useState([]);
  const [playerPicksLoading, setPlayerPicksLoading] = useState(false);

  // Captain state
  const [captainPickId, setCaptainPickId] = useState(null);
  const [captainSaved, setCaptainSaved] = useState(false);

  // Navigate to terminal states
  useEffect(() => {
    if (game?.status === 'tournament' || game?.status === 'complete') {
      navigate(`/leaderboard/${gameId}`, { replace: true });
    }
  }, [game, gameId, navigate]);

  // Load teams
  useEffect(() => {
    async function loadTeams() {
      setTeamsLoading(true);
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .order('name');

      if (!error && data && data.length > 0) {
        setTeams(data);
      } else {
        // Build from fallback pots
        const fallback = [];
        for (const [pot, names] of Object.entries(FALLBACK_POTS)) {
          for (const name of names) {
            fallback.push({ api_id: `fallback-${name.replace(/\s/g, '-')}`, name, logo_url: null, pot: parseInt(pot) });
          }
        }
        setTeams(fallback);
      }
      setTeamsLoading(false);
    }
    loadTeams();
  }, []);

  // Load player picks for player selection phase
  useEffect(() => {
    if (game?.status !== 'selecting_players') return;
    async function loadPlayerPicks() {
      setPlayerPicksLoading(true);
      const { data } = await supabase
        .from('player_picks')
        .select('*')
        .eq('game_id', gameId)
        .eq('game_player_id', myPlayerId);
      if (data) setSavedPlayerPicks(data);
      setPlayerPicksLoading(false);
    }
    loadPlayerPicks();
  }, [game?.status, gameId, myPlayerId]);

  // Load players for a team
  async function loadTeamPlayers(teamApiId) {
    if (teamPlayers[teamApiId]) return;
    const { data } = await supabase
      .from('players')
      .select('*')
      .eq('team_api_id', teamApiId)
      .order('position')
      .order('name');
    if (data) {
      setTeamPlayers((prev) => ({ ...prev, [teamApiId]: data }));
    }
  }

  // Load captain pick
  useEffect(() => {
    if (game?.status !== 'selecting_captain') return;
    async function loadCaptain() {
      const { data } = await supabase
        .from('captain_picks')
        .select('*, player_picks(player_api_id)')
        .eq('game_id', gameId)
        .eq('game_player_id', myPlayerId)
        .maybeSingle();
      if (data) {
        setCaptainPickId(data.player_picks?.player_api_id ?? null);
        setCaptainSaved(true);
      }
    }
    loadCaptain();
  }, [game?.status, gameId, myPlayerId]);

  const snakeOrder = getSnakeOrder(players, TOTAL_ROUNDS);
  const currentPickerIndex = getCurrentPicker(picks, players, TOTAL_ROUNDS);
  const myPicks = picks.filter((p) => p.game_player_id === myPlayerId);
  const isMyTurn = players[currentPickerIndex]?.id === myPlayerId;
  const draftComplete = picks.length >= players.length * TOTAL_ROUNDS;

  // Taken teams map: teamApiId -> playerName
  const takenTeamsMap = {};
  for (const pick of picks) {
    const player = players.find((p) => p.id === pick.game_player_id);
    takenTeamsMap[pick.team_api_id] = player?.player_name || 'Taken';
  }

  async function handleConfirmPick() {
    if (!selectedTeam || !isMyTurn || submitting) return;
    setSubmitting(true);
    try {
      const pickNumber = picks.length + 1;
      const { error } = await supabase.from('draft_picks').insert({
        game_id: gameId,
        game_player_id: myPlayerId,
        pick_number: pickNumber,
        team_api_id: selectedTeam.api_id,
      });
      if (error) throw error;
      setSelectedTeam(null);
    } catch (err) {
      alert('Failed to submit pick: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePoke(player) {
    await supabase.from('notifications').insert({
      game_id: gameId,
      game_player_id: player.id,
      type: 'poke',
      message: "It's your turn to pick! 🎯",
      read: false,
    });
  }

  async function handleAdvancePhase() {
    const transitions = {
      drafting_teams: 'selecting_players',
      selecting_players: 'selecting_captain',
      selecting_captain: 'tournament',
    };
    const next = transitions[game.status];
    if (!next) return;
    const { error } = await supabase
      .from('games')
      .update({ status: next })
      .eq('id', gameId);
    if (error) alert('Error: ' + error.message);
  }

  // Toggle player selection for player picks phase
  function togglePlayerPick(teamApiId, playerApiId) {
    setSelectedPlayerIds((prev) => {
      const current = prev[teamApiId] || [];
      if (current.includes(playerApiId)) {
        return { ...prev, [teamApiId]: current.filter((id) => id !== playerApiId) };
      }
      if (current.length >= 3) {
        return { ...prev, [teamApiId]: [...current.slice(1), playerApiId] };
      }
      return { ...prev, [teamApiId]: [...current, playerApiId] };
    });
  }

  async function handleSavePlayerPicks(teamApiId) {
    const playerIds = selectedPlayerIds[teamApiId] || [];
    if (playerIds.length === 0) return;

    // Find the draft_pick for this team (links player_picks back to the team)
    const draftPick = picks.find((p) => p.game_player_id === myPlayerId && p.team_api_id === teamApiId);
    if (!draftPick) { alert('Draft pick not found for this team'); return; }

    // Remove old picks for this draft_pick
    await supabase
      .from('player_picks')
      .delete()
      .eq('game_id', gameId)
      .eq('game_player_id', myPlayerId)
      .eq('draft_pick_id', draftPick.id);

    // Insert new picks
    const inserts = playerIds.map((pid) => ({
      game_id: gameId,
      game_player_id: myPlayerId,
      draft_pick_id: draftPick.id,
      player_api_id: pid,
    }));
    const { error } = await supabase.from('player_picks').insert(inserts);
    if (error) {
      alert('Failed to save: ' + error.message);
    } else {
      setSavedPlayerPicks((prev) => {
        const filtered = prev.filter((p) => p.draft_pick_id !== draftPick.id);
        return [...filtered, ...inserts.map((i, idx) => ({ ...i, id: `temp-${idx}` }))];
      });
    }
  }

  async function handleSaveCaptain() {
    if (!captainPickId) return;
    // Find the player_pick row for this player
    const playerPickRow = savedPlayerPicks.find((p) => p.player_api_id === captainPickId);
    if (!playerPickRow?.id || playerPickRow.id.startsWith('temp-')) {
      // Re-fetch from DB to get real id
      const { data: ppData } = await supabase
        .from('player_picks')
        .select('id')
        .eq('game_id', gameId)
        .eq('game_player_id', myPlayerId)
        .eq('player_api_id', captainPickId)
        .maybeSingle();
      if (!ppData) { alert('Player pick not found'); return; }
      playerPickRow.id = ppData.id;
    }
    // Remove existing captain pick
    await supabase
      .from('captain_picks')
      .delete()
      .eq('game_id', gameId)
      .eq('game_player_id', myPlayerId);
    const { error } = await supabase.from('captain_picks').insert({
      game_id: gameId,
      game_player_id: myPlayerId,
      player_pick_id: playerPickRow.id,
    });
    if (error) {
      alert('Failed to save captain: ' + error.message);
    } else {
      setCaptainSaved(true);
    }
  }

  // My teams for player pick phase
  const myTeamIds = myPicks.map((p) => p.team_api_id);
  const myTeams = myTeamIds.map((id) => teams.find((t) => t.api_id === id)).filter(Boolean);

  // My picked players for captain selection
  const myPickedPlayerApiIds = savedPlayerPicks.map((p) => p.player_api_id);

  if (gameLoading || playersLoading || teamsLoading) {
    return (
      <div className="loading">
        <div className="spinner" />
        Loading draft...
      </div>
    );
  }

  return (
    <div className="page" style={{ paddingBottom: 100 }}>
      {showPoke && <PokeToast message={pokeMessage} onDismiss={dismissPoke} />}

      {/* Phase header */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--gold)' }}>
          {game?.status === 'drafting_teams' && '🏳️ Team Draft'}
          {game?.status === 'selecting_players' && '👥 Pick Your Players'}
          {game?.status === 'selecting_captain' && '👑 Choose Your Captain'}
        </h1>
      </div>

      {/* PHASE: drafting_teams */}
      {game?.status === 'drafting_teams' && (
        <>
          {/* Snake order bar */}
          <SnakeOrderBar
            players={players}
            currentPickerIndex={currentPickerIndex}
            myPlayerId={myPlayerId}
          />

          {/* Host dashboard */}
          {isHost && (
            <HostDashboard
              players={players}
              picks={picks}
              currentPickerIndex={currentPickerIndex}
              onPoke={handlePoke}
              teams={teams}
            />
          )}

          {/* My squad */}
          <SquadBuilder picks={picks} teams={teams} myPlayerId={myPlayerId} />

          {/* Status message */}
          {isMyTurn && !draftComplete && (
            <div
              className="card"
              style={{
                textAlign: 'center',
                borderColor: 'var(--gold)',
                background: 'rgba(255,215,0,0.05)',
                marginBottom: 16,
                padding: '12px 16px',
              }}
            >
              <span style={{ color: 'var(--gold)', fontWeight: 700 }}>
                🎯 It&apos;s your turn to pick!
              </span>
            </div>
          )}
          {!isMyTurn && !draftComplete && (
            <div className="card" style={{ textAlign: 'center', marginBottom: 16, padding: '12px 16px' }}>
              <span className="text-muted">
                Waiting for{' '}
                <strong style={{ color: 'var(--text)' }}>
                  {players[currentPickerIndex]?.player_name || '...'}
                </strong>{' '}
                to pick
              </span>
            </div>
          )}

          {draftComplete && isHost && (
            <div className="card" style={{ textAlign: 'center', marginBottom: 16 }}>
              <p style={{ fontWeight: 700, marginBottom: 12 }}>✅ Team draft complete!</p>
              <button className="btn btn-primary" onClick={handleAdvancePhase}>
                Advance to Player Selection →
              </button>
            </div>
          )}

          {/* Teams grid */}
          <div>
            <div className="section-title">
              Select a Team {isMyTurn ? '' : '(view only)'}
            </div>
            {/* Pot headers */}
            {[1, 2, 3, 4].map((pot) => {
              const potTeams = teams.filter((t) => t.pot === pot);
              if (potTeams.length === 0) return null;
              return (
                <div key={pot} style={{ marginBottom: 24 }}>
                  <div
                    className="text-muted text-xs"
                    style={{ marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}
                  >
                    Pot {pot}
                  </div>
                  <div className="card-grid">
                    {potTeams.map((team) => {
                      const taken = !!takenTeamsMap[team.api_id];
                      const takenBy = takenTeamsMap[team.api_id];
                      const isSelected = selectedTeam?.api_id === team.api_id;
                      return (
                        <TeamCard
                          key={team.api_id}
                          team={team}
                          selected={isSelected}
                          taken={taken}
                          takenBy={takenBy}
                          onClick={isMyTurn && !draftComplete ? (t) => setSelectedTeam(isSelected ? null : t) : null}
                          disabled={!isMyTurn || draftComplete}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Teams without pot (fallback ungrouped) */}
            {(() => {
              const noPotTeams = teams.filter((t) => !t.pot);
              if (noPotTeams.length === 0) return null;
              return (
                <div style={{ marginBottom: 24 }}>
                  <div className="text-muted text-xs" style={{ marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    All Teams
                  </div>
                  <div className="card-grid">
                    {noPotTeams.map((team) => {
                      const taken = !!takenTeamsMap[team.api_id];
                      const isSelected = selectedTeam?.api_id === team.api_id;
                      return (
                        <TeamCard
                          key={team.api_id}
                          team={team}
                          selected={isSelected}
                          taken={taken}
                          takenBy={takenTeamsMap[team.api_id]}
                          onClick={isMyTurn && !draftComplete ? (t) => setSelectedTeam(isSelected ? null : t) : null}
                          disabled={!isMyTurn || draftComplete}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Confirm bar */}
          <ConfirmBar
            selectedTeam={selectedTeam}
            onConfirm={handleConfirmPick}
            onCancel={() => setSelectedTeam(null)}
          />
        </>
      )}

      {/* PHASE: selecting_players */}
      {game?.status === 'selecting_players' && (
        <>
          <p className="text-muted text-center mb-16">
            Pick 3 players from each of your 8 teams
          </p>

          {isHost && (
            <div className="card mb-16" style={{ textAlign: 'center' }}>
              <button className="btn btn-primary" onClick={handleAdvancePhase}>
                Advance to Captain Selection →
              </button>
            </div>
          )}

          {/* Team tabs */}
          <div className="tabs scroll-x" style={{ marginBottom: 16 }}>
            {myTeams.map((team) => {
              const draftPick = picks.find((p) => p.game_player_id === myPlayerId && p.team_api_id === team.api_id);
              const savedCount = savedPlayerPicks.filter((p) => p.draft_pick_id === draftPick?.id).length;
              return (
                <button
                  key={team.api_id}
                  className={`tab${activeTeamTab === team.api_id ? ' active' : ''}`}
                  onClick={() => {
                    setActiveTeamTab(team.api_id);
                    loadTeamPlayers(team.api_id);
                  }}
                >
                  {team.name}
                  {savedCount > 0 && (
                    <span
                      className="badge badge-success"
                      style={{ marginLeft: 6, fontSize: '0.65rem' }}
                    >
                      {savedCount}/3
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {activeTeamTab && (
            <div className="card">
              {playerPicksLoading || !teamPlayers[activeTeamTab] ? (
                <div className="loading" style={{ padding: 24 }}>
                  <div className="spinner" />
                  Loading players...
                </div>
              ) : teamPlayers[activeTeamTab].length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">👤</div>
                  <p>No players found for this team.</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-12">
                    <span className="text-muted text-sm">
                      Select 3 players ({(selectedPlayerIds[activeTeamTab] || []).length}/3)
                    </span>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => handleSavePlayerPicks(activeTeamTab)}
                      disabled={(selectedPlayerIds[activeTeamTab] || []).length === 0}
                    >
                      Save Picks
                    </button>
                  </div>
                  <div className="card-grid">
                    {teamPlayers[activeTeamTab].map((player) => {
                      const isSelected = (selectedPlayerIds[activeTeamTab] || []).includes(player.api_id);
                      return (
                        <PlayerCard
                          key={player.api_id}
                          player={player}
                          selected={isSelected}
                          onClick={() => togglePlayerPick(activeTeamTab, player.api_id)}
                          showPosition
                        />
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {!activeTeamTab && (
            <div className="empty-state">
              <div className="empty-icon">👆</div>
              <p>Select a team tab above to pick players</p>
            </div>
          )}
        </>
      )}

      {/* PHASE: selecting_captain */}
      {game?.status === 'selecting_captain' && (
        <>
          <p className="text-muted text-center mb-16">
            Your captain earns double points throughout the tournament
          </p>

          {isHost && (
            <div className="card mb-16" style={{ textAlign: 'center' }}>
              <button className="btn btn-primary" onClick={handleAdvancePhase}>
                Start Tournament →
              </button>
            </div>
          )}

          <div className="card">
            <CaptainGrid
              playerPicks={(() => {
                // Build player objects from savedPlayerPicks + teamPlayers cache
                const all = [];
                for (const pp of savedPlayerPicks) {
                  for (const tPlayers of Object.values(teamPlayers)) {
                    const found = tPlayers.find((p) => p.api_id === pp.player_api_id);
                    if (found) { all.push(found); break; }
                  }
                }
                return all;
              })()}
              captainPickId={captainPickId}
              onSelectCaptain={(player) => {
                setCaptainPickId(player.api_id);
                setCaptainSaved(false);
              }}
            />
            <div className="mt-16">
              <button
                className="btn btn-primary btn-full"
                onClick={handleSaveCaptain}
                disabled={!captainPickId || captainSaved}
              >
                {captainSaved ? '✅ Captain Saved' : '👑 Confirm Captain'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
