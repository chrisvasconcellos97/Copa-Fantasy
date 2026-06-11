import React, { useState, useEffect, useMemo } from 'react';
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
import PlayerCard from '../components/PlayerCard';
import ConfirmBar from '../components/ConfirmBar';
import SnakeOrderBar from '../components/SnakeOrderBar';
import HostDashboard from '../components/HostDashboard';
import SquadBuilder from '../components/SquadBuilder';
import CaptainGrid from '../components/CaptainGrid';
import PokeToast from '../components/PokeToast';

const TEAMS_PER_PLAYER = 8;
const PLAYERS_PER_TEAM = 3;

export default function DraftView() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const session = getSession();
  const myPlayerId = session?.playerId;
  const isHost = Boolean(session?.hostToken);

  const { game, loading: gameLoading } = useGame(gameId);
  const { players } = usePlayers(gameId);
  const { picks, loading: picksLoading } = useDraft(gameId);
  const { showPoke, dismissPoke, pokeMessage } = useNotifications(myPlayerId);

  // Teams
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [confirmingPick, setConfirmingPick] = useState(false);

  // Player selection
  const [squadPlayers, setSquadPlayers] = useState({});
  const [activeTeamTab, setActiveTeamTab] = useState(null);
  const [selectedPlayers, setSelectedPlayers] = useState({});
  const [savingPlayers, setSavingPlayers] = useState(false);
  const [existingPlayerPicks, setExistingPlayerPicks] = useState([]);

  // Captain
  const [captainId, setCaptainId] = useState(null);
  const [savingCaptain, setSavingCaptain] = useState(false);
  const [existingCaptain, setExistingCaptain] = useState(null);

  // Redirect when tournament starts
  useEffect(() => {
    if (!game) return;
    if (game.status === 'tournament' || game.status === 'complete') {
      navigate(`/leaderboard/${gameId}`, { replace: true });
    }
  }, [game, gameId, navigate]);

  // Load teams from DB or fallback
  useEffect(() => {
    async function loadTeams() {
      const { data } = await supabase.from('teams').select('*').order('pot');
      if (data && data.length > 0) {
        setTeams(data);
      } else {
        // Build from FALLBACK_POTS
        const fallback = [];
        for (const [pot, names] of Object.entries(FALLBACK_POTS)) {
          names.forEach((name, idx) => {
            fallback.push({
              api_id: `fallback-${pot}-${idx}`,
              name,
              pot: parseInt(pot),
              logo_url: null,
            });
          });
        }
        setTeams(fallback);
      }
    }
    loadTeams();
  }, []);

  // Load existing player picks and captain
  useEffect(() => {
    if (!gameId || !myPlayerId) return;
    async function loadExisting() {
      const { data: pp } = await supabase
        .from('player_picks')
        .select('*')
        .eq('game_id', gameId)
        .eq('game_player_id', myPlayerId);
      if (pp) setExistingPlayerPicks(pp);

      const { data: cp } = await supabase
        .from('captain_picks')
        .select('*')
        .eq('game_id', gameId)
        .eq('game_player_id', myPlayerId)
        .single();
      if (cp) {
        setExistingCaptain(cp);
        setCaptainId(cp.player_api_id);
      }
    }
    loadExisting();
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

  const totalRounds = TEAMS_PER_PLAYER;
  const currentPickerIdx = useMemo(
    () => getCurrentPicker(picks, players, totalRounds),
    [picks, players, totalRounds]
  );

  const currentPicker = currentPickerIdx >= 0 ? players[currentPickerIdx] : null;
  const isMyTurn = currentPicker?.id === myPlayerId;
  const draftComplete = picks.length >= players.length * TEAMS_PER_PLAYER;

  const takenTeamIds = new Set(picks.map((p) => String(p.team_api_id)));

  function getTakenBy(teamApiId) {
    const pick = picks.find((p) => String(p.team_api_id) === String(teamApiId));
    if (!pick) return null;
    const pl = players.find((p) => p.id === pick.game_player_id);
    return pl?.player_name || 'Someone';
  }

  async function handleConfirmPick() {
    if (!selectedTeam || !isMyTurn || confirmingPick) return;
    setConfirmingPick(true);
    try {
      const { error } = await supabase.from('draft_picks').insert({
        game_id: gameId,
        game_player_id: myPlayerId,
        pick_number: picks.length + 1,
        team_api_id: selectedTeam.api_id,
      });
      if (error) throw error;
      setSelectedTeam(null);
    } catch (err) {
      alert(err.message);
    } finally {
      setConfirmingPick(false);
    }
  }

  async function handlePoke(player) {
    await supabase.from('notifications').insert({
      game_player_id: player.id,
      type: 'poke',
      message: "It's your turn to pick! 👈",
      read: false,
    });
  }

  async function handleAdvancePhase() {
    const next = {
      drafting_teams: 'selecting_players',
      selecting_players: 'selecting_captain',
      selecting_captain: 'tournament',
    };
    const current = game?.status;
    if (!next[current]) return;
    const { error } = await supabase
      .from('games')
      .update({ status: next[current] })
      .eq('id', gameId);
    if (error) alert(error.message);
  }

  // My draft teams
  const myDraftPicks = picks.filter((p) => p.game_player_id === myPlayerId);
  const myTeams = myDraftPicks
    .map((p) => teams.find((t) => String(t.api_id) === String(p.team_api_id)))
    .filter(Boolean);

  // Toggle player selection
  function togglePlayer(teamApiId, player) {
    setSelectedPlayers((prev) => {
      const teamSel = prev[teamApiId] || [];
      if (teamSel.some((p) => String(p.api_id) === String(player.api_id))) {
        return { ...prev, [teamApiId]: teamSel.filter((p) => String(p.api_id) !== String(player.api_id)) };
      }
      if (teamSel.length >= PLAYERS_PER_TEAM) return prev;
      return { ...prev, [teamApiId]: [...teamSel, player] };
    });
  }

  async function handleSavePlayers() {
    setSavingPlayers(true);
    try {
      const rows = [];
      for (const [teamApiId, pls] of Object.entries(selectedPlayers)) {
        for (const pl of pls) {
          rows.push({
            game_id: gameId,
            game_player_id: myPlayerId,
            player_api_id: pl.api_id,
            team_api_id: teamApiId,
          });
        }
      }
      if (rows.length > 0) {
        const { error } = await supabase
          .from('player_picks')
          .upsert(rows, { onConflict: 'game_id,game_player_id,player_api_id' });
        if (error) throw error;
      }
      alert('Players saved!');
    } catch (err) {
      alert(err.message);
    } finally {
      setSavingPlayers(false);
    }
  }

  async function handleSaveCaptain() {
    if (!captainId) return;
    setSavingCaptain(true);
    try {
      const { error } = await supabase
        .from('captain_picks')
        .upsert(
          { game_id: gameId, game_player_id: myPlayerId, player_api_id: captainId },
          { onConflict: 'game_id,game_player_id' }
        );
      if (error) throw error;
      alert('Captain saved!');
    } catch (err) {
      alert(err.message);
    } finally {
      setSavingCaptain(false);
    }
  }

  // Build player picks for captain grid
  const allMyPlayerPicks = useMemo(() => {
    const fromExisting = existingPlayerPicks.map((pp) => ({
      api_id: pp.player_api_id,
      player_api_id: pp.player_api_id,
      name: pp.player_api_id,
      position: null,
      photo_url: null,
    }));
    const fromSelected = Object.values(selectedPlayers).flat().map((p) => ({
      ...p,
      player_api_id: p.api_id,
    }));
    // Merge
    const map = new Map();
    [...fromExisting, ...fromSelected].forEach((p) => map.set(String(p.api_id || p.player_api_id), p));
    return Array.from(map.values());
  }, [existingPlayerPicks, selectedPlayers]);

  if (gameLoading) {
    return <div className="loading-center"><div className="spinner" /></div>;
  }

  if (!game) {
    return <div className="page text-center"><p className="text-muted">Game not found.</p></div>;
  }

  const status = game.status;

  return (
    <div className="page container">
      {showPoke && <PokeToast message={pokeMessage} onDismiss={dismissPoke} />}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ color: 'var(--gold)' }}>
            {status === 'drafting_teams' && '🏳️ Team Draft'}
            {status === 'selecting_players' && '👤 Pick Players'}
            {status === 'selecting_captain' && '👑 Choose Captain'}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            {players.length} players · {picks.length} picks made
          </p>
        </div>
        {isHost && (
          <button className="btn btn-secondary btn-sm" onClick={handleAdvancePhase}>
            Advance Phase →
          </button>
        )}
      </div>

      {/* PHASE: drafting_teams */}
      {status === 'drafting_teams' && (
        <>
          <SnakeOrderBar
            players={players}
            currentPickerIndex={currentPickerIdx}
            myPlayerId={myPlayerId}
          />

          <div style={{ marginBottom: 16 }}>
            {draftComplete ? (
              <div
                style={{
                  background: 'rgba(68,204,136,0.1)',
                  border: '1px solid var(--success)',
                  borderRadius: 8,
                  padding: '10px 16px',
                  color: 'var(--success)',
                  fontSize: '0.9rem',
                }}
              >
                ✅ Draft complete! Host can advance to player selection.
              </div>
            ) : isMyTurn ? (
              <div
                style={{
                  background: 'rgba(255,215,0,0.08)',
                  border: '1px solid var(--gold)',
                  borderRadius: 8,
                  padding: '10px 16px',
                  color: 'var(--gold)',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                }}
              >
                ⭐ It's your turn! Pick #{picks.length + 1}
              </div>
            ) : (
              <div
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: 8,
                  padding: '10px 16px',
                  color: 'var(--text-muted)',
                  fontSize: '0.9rem',
                }}
              >
                Waiting for {currentPicker?.player_name || 'player'} to pick...
              </div>
            )}
          </div>

          {isHost && (
            <div style={{ marginBottom: 20 }}>
              <HostDashboard
                players={players}
                picks={picks}
                currentPickerIndex={currentPickerIdx}
                onPoke={handlePoke}
                teams={teams}
              />
            </div>
          )}

          <div style={{ marginBottom: 20 }}>
            <SquadBuilder picks={picks} teams={teams} myPlayerId={myPlayerId} />
          </div>

          <h3 style={{ marginBottom: 12 }}>All Teams</h3>
          {[1, 2, 3, 4].map((pot) => {
            const potTeams = teams.filter((t) => t.pot === pot);
            if (potTeams.length === 0) return null;
            return (
              <div key={pot} style={{ marginBottom: 20 }}>
                <div
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                    marginBottom: 8,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Pot {pot}
                </div>
                <div className="team-grid">
                  {potTeams.map((team) => {
                    const taken = takenTeamIds.has(String(team.api_id));
                    const takenBy = taken ? getTakenBy(team.api_id) : null;
                    const isSelected = selectedTeam?.api_id === team.api_id;
                    return (
                      <TeamCard
                        key={team.api_id}
                        team={team}
                        selected={isSelected}
                        taken={taken}
                        takenBy={takenBy}
                        disabled={!isMyTurn || draftComplete}
                        onClick={(t) => {
                          if (isMyTurn && !taken) {
                            setSelectedTeam(isSelected ? null : t);
                          }
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}

          <ConfirmBar
            selectedTeam={selectedTeam}
            onConfirm={handleConfirmPick}
            onCancel={() => setSelectedTeam(null)}
          />
        </>
      )}

      {/* PHASE: selecting_players */}
      {status === 'selecting_players' && (
        <>
          <p style={{ color: 'var(--text-muted)', marginBottom: 16, fontSize: '0.9rem' }}>
            Pick {PLAYERS_PER_TEAM} players from each of your {myTeams.length} teams.
          </p>

          {myTeams.length === 0 ? (
            <div className="empty-state">You have no drafted teams.</div>
          ) : (
            <>
              <div className="tabs" style={{ marginBottom: 20 }}>
                {myTeams.map((team) => {
                  const selCount = (selectedPlayers[team.api_id] || []).length;
                  const existing = existingPlayerPicks.filter(
                    (pp) => String(pp.team_api_id) === String(team.api_id)
                  ).length;
                  const total = selCount + existing;
                  return (
                    <button
                      key={team.api_id}
                      className={`tab ${activeTeamTab === team.api_id ? 'active' : ''}`}
                      onClick={() => {
                        setActiveTeamTab(team.api_id);
                        loadSquadForTeam(team.api_id);
                      }}
                    >
                      {team.name}
                      {total > 0 && (
                        <span
                          style={{
                            marginLeft: 4,
                            fontSize: '0.7rem',
                            color: total >= PLAYERS_PER_TEAM ? 'var(--success)' : 'var(--gold)',
                          }}
                        >
                          ({total}/{PLAYERS_PER_TEAM})
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {activeTeamTab && (
                <div>
                  {!squadPlayers[activeTeamTab] ? (
                    <div className="loading-center"><div className="spinner" /></div>
                  ) : squadPlayers[activeTeamTab].length === 0 ? (
                    <div className="empty-state">No players found for this team.</div>
                  ) : (
                    <div className="player-grid">
                      {squadPlayers[activeTeamTab].map((player) => {
                        const isSelected = (selectedPlayers[activeTeamTab] || []).some(
                          (p) => String(p.api_id) === String(player.api_id)
                        );
                        const existingPick = existingPlayerPicks.find(
                          (pp) => String(pp.player_api_id) === String(player.api_id)
                        );
                        return (
                          <PlayerCard
                            key={player.api_id}
                            player={player}
                            selected={isSelected || Boolean(existingPick)}
                            onClick={() => {
                              if (!existingPick) togglePlayer(activeTeamTab, player);
                            }}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {!activeTeamTab && (
                <div className="empty-state">Select a team tab above to pick players.</div>
              )}

              <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
                <button
                  className="btn btn-primary"
                  onClick={handleSavePlayers}
                  disabled={savingPlayers}
                >
                  {savingPlayers ? 'Saving...' : 'Save Player Picks'}
                </button>
              </div>
            </>
          )}
        </>
      )}

      {/* PHASE: selecting_captain */}
      {status === 'selecting_captain' && (
        <>
          <p style={{ color: 'var(--text-muted)', marginBottom: 20, fontSize: '0.9rem' }}>
            Choose one player as your captain. They'll earn double points!
          </p>
          {allMyPlayerPicks.length === 0 ? (
            <div className="empty-state">No players picked yet.</div>
          ) : (
            <CaptainGrid
              playerPicks={allMyPlayerPicks}
              captainPickId={captainId}
              onSelectCaptain={(id) => setCaptainId(id)}
            />
          )}
          <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
            <button
              className="btn btn-primary"
              onClick={handleSaveCaptain}
              disabled={!captainId || savingCaptain}
            >
              {savingCaptain ? 'Saving...' : 'Confirm Captain'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
