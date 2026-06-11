import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGame } from '../hooks/useGame.js';
import { usePlayers } from '../hooks/usePlayers.js';
import { useDraft } from '../hooks/useDraft.js';
import { useNotifications } from '../hooks/useNotifications.js';
import { getSession } from '../lib/session.js';
import { supabase } from '../lib/supabase.js';
import { FALLBACK_POTS } from '../lib/constants.js';
import { getSnakeOrder, getCurrentPicker } from '../lib/draft.js';
import TeamCard from '../components/TeamCard.jsx';
import ConfirmBar from '../components/ConfirmBar.jsx';
import SnakeOrderBar from '../components/SnakeOrderBar.jsx';
import HostDashboard from '../components/HostDashboard.jsx';
import PokeToast from '../components/PokeToast.jsx';
import SquadBuilder from '../components/SquadBuilder.jsx';
import PlayerCard from '../components/PlayerCard.jsx';
import CaptainGrid from '../components/CaptainGrid.jsx';

const TOTAL_ROUNDS = 8;

function buildFallbackTeams() {
  const teams = [];
  for (const [pot, names] of Object.entries(FALLBACK_POTS)) {
    for (const name of names) {
      teams.push({ api_id: name, name, logo_url: null, pot: Number(pot) });
    }
  }
  return teams;
}

export default function DraftView() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const { game, loading: gameLoading } = useGame(gameId);
  const { players, loading: playersLoading } = usePlayers(gameId);
  const { picks, loading: picksLoading } = useDraft(gameId);
  const session = getSession();
  const myPlayerId = session?.playerId;
  const isHost = !!session?.hostToken;
  const { showPoke, dismissPoke, pokeMessage } = useNotifications(myPlayerId);

  const [teams, setTeams] = useState([]);
  const [teamsLoading, setTeamsLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [confirming, setConfirming] = useState(false);

  // Player picks phase
  const [squadPlayers, setSquadPlayers] = useState({});
  const [selectedTab, setSelectedTab] = useState(0);
  const [selectedPlayers, setSelectedPlayers] = useState({});
  const [savedPlayerPicks, setSavedPlayerPicks] = useState([]);
  const [savingPlayers, setSavingPlayers] = useState(false);

  // Captain phase
  const [captainId, setCaptainId] = useState(null);
  const [savedCaptain, setSavedCaptain] = useState(null);
  const [savingCaptain, setSavingCaptain] = useState(false);

  // Load teams from DB, fall back to constants
  useEffect(() => {
    async function loadTeams() {
      setTeamsLoading(true);
      const { data, error } = await supabase.from('teams').select('*');
      if (!error && data && data.length > 0) {
        setTeams(data);
      } else {
        setTeams(buildFallbackTeams());
      }
      setTeamsLoading(false);
    }
    loadTeams();
  }, []);

  // Load existing player picks
  useEffect(() => {
    if (!gameId || !myPlayerId) return;
    async function loadPlayerPicks() {
      const { data } = await supabase
        .from('player_picks')
        .select('*')
        .eq('game_id', gameId)
        .eq('game_player_id', myPlayerId);
      if (data) setSavedPlayerPicks(data);
    }
    loadPlayerPicks();
  }, [gameId, myPlayerId, game?.status]);

  // Load existing captain pick
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

  // Navigate to leaderboard when tournament phase
  useEffect(() => {
    if (game && (game.status === 'tournament' || game.status === 'complete')) {
      navigate(`/leaderboard/${gameId}`, { replace: true });
    }
  }, [game, gameId, navigate]);

  // Load squad players for a team
  useEffect(() => {
    if (game?.status !== 'selecting_players') return;
    const myPicks = picks.filter((p) => p.game_player_id === myPlayerId);
    myPicks.forEach(async (pick) => {
      if (squadPlayers[pick.team_api_id]) return;
      const { data } = await supabase
        .from('players')
        .select('*')
        .eq('team_api_id', pick.team_api_id);
      if (data && data.length > 0) {
        setSquadPlayers((prev) => ({ ...prev, [pick.team_api_id]: data }));
      }
    });
  }, [game?.status, picks, myPlayerId]);

  const snakeOrder = useMemo(
    () => (players.length > 0 ? getSnakeOrder(players, TOTAL_ROUNDS) : []),
    [players]
  );

  const currentPicker = useMemo(
    () => getCurrentPicker(picks, players, TOTAL_ROUNDS),
    [picks, players]
  );

  const currentPickerIndex = useMemo(() => {
    if (!currentPicker) return -1;
    return players.findIndex((p) => p.id === currentPicker.id);
  }, [currentPicker, players]);

  const isMyTurn = currentPicker?.id === myPlayerId;

  const takenTeamMap = useMemo(() => {
    const map = {};
    picks.forEach((pick) => {
      const player = players.find((p) => p.id === pick.game_player_id);
      map[pick.team_api_id] = player?.player_name || 'Taken';
    });
    return map;
  }, [picks, players]);

  async function confirmPick() {
    if (!selectedTeam || !isMyTurn || confirming) return;
    setConfirming(true);
    try {
      await supabase.from('draft_picks').insert({
        game_id: gameId,
        game_player_id: myPlayerId,
        pick_number: picks.length,
        team_api_id: selectedTeam.api_id,
      });
      setSelectedTeam(null);
    } catch (err) {
      console.error('Pick failed:', err);
    } finally {
      setConfirming(false);
    }
  }

  async function handlePoke(targetPlayerId) {
    await supabase.from('notifications').insert({
      game_player_id: targetPlayerId,
      type: 'poke',
      message: "It's your turn to pick! ⚽",
      read: false,
    });
  }

  async function advancePhase() {
    const transitions = {
      drafting_teams: 'selecting_players',
      selecting_players: 'selecting_captain',
      selecting_captain: 'tournament',
    };
    const next = transitions[game.status];
    if (next) await supabase.from('games').update({ status: next }).eq('id', gameId);
  }

  async function savePlayerPicks() {
    setSavingPlayers(true);
    try {
      const myDraftPicks = picks.filter((p) => p.game_player_id === myPlayerId);
      const rows = [];
      for (const draftPick of myDraftPicks) {
        const sel = selectedPlayers[draftPick.team_api_id] || [];
        sel.forEach((playerApiId) => {
          rows.push({
            game_id: gameId,
            game_player_id: myPlayerId,
            player_api_id: playerApiId,
            team_api_id: draftPick.team_api_id,
          });
        });
      }
      if (rows.length > 0) {
        // Delete existing first
        await supabase
          .from('player_picks')
          .delete()
          .eq('game_id', gameId)
          .eq('game_player_id', myPlayerId);
        await supabase.from('player_picks').insert(rows);
        setSavedPlayerPicks(rows.map((r, i) => ({ ...r, id: i })));
      }
    } finally {
      setSavingPlayers(false);
    }
  }

  async function saveCaptain() {
    if (!captainId) return;
    setSavingCaptain(true);
    try {
      await supabase
        .from('captain_picks')
        .upsert({ game_id: gameId, game_player_id: myPlayerId, player_api_id: captainId });
      setSavedCaptain(captainId);
    } finally {
      setSavingCaptain(false);
    }
  }

  if (gameLoading || playersLoading || picksLoading || teamsLoading) {
    return (
      <div className="loader-center">
        <div className="spinner" />
      </div>
    );
  }

  if (!game) {
    return (
      <div className="page">
        <div className="empty-state"><p>Game not found.</p></div>
      </div>
    );
  }

  const myDraftPicks = picks.filter((p) => p.game_player_id === myPlayerId);
  const isDraftComplete = picks.length >= players.length * TOTAL_ROUNDS;

  // ── DRAFTING TEAMS ──
  if (game.status === 'drafting_teams') {
    const teamsByPot = {};
    teams.forEach((t) => {
      const pot = t.pot || 1;
      if (!teamsByPot[pot]) teamsByPot[pot] = [];
      teamsByPot[pot].push(t);
    });

    return (
      <div className="page">
        <PokeToast message={showPoke ? pokeMessage : ''} onDismiss={dismissPoke} />

        <div className="page-header">
          <h1 className="page-title">Team Draft</h1>
          {isMyTurn && <span className="badge badge-gold">Your Turn!</span>}
          {!isMyTurn && currentPicker && (
            <span className="badge badge-muted">Waiting: {currentPicker.player_name}</span>
          )}
        </div>

        <SnakeOrderBar
          players={players}
          currentPickerIndex={currentPickerIndex}
          myPlayerId={myPlayerId}
        />

        <div className="divider" />

        <div style={{ display: 'grid', gridTemplateColumns: isHost ? '1fr 300px' : '1fr', gap: 24, alignItems: 'start' }}>
          <div>
            <div className="mb-16">
              <SquadBuilder picks={picks} teams={teams} myPlayerId={myPlayerId} />
            </div>

            {[1, 2, 3, 4].map((pot) => (
              <div key={pot} className="pot-section">
                <div className="pot-header">
                  <span className="pot-label">Pot {pot}</span>
                  <div className="divider" style={{ flex: 1, margin: '0 12px' }} />
                </div>
                <div className="team-grid">
                  {(teamsByPot[pot] || []).map((team) => {
                    const taken = !!takenTeamMap[team.api_id];
                    const takenBy = takenTeamMap[team.api_id];
                    const isSelected = selectedTeam?.api_id === team.api_id;
                    return (
                      <TeamCard
                        key={team.api_id}
                        team={team}
                        selected={isSelected}
                        taken={taken}
                        takenBy={takenBy}
                        onClick={isMyTurn && !taken ? setSelectedTeam : null}
                        disabled={!isMyTurn || taken}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {isHost && (
            <div style={{ position: 'sticky', top: 80 }}>
              <HostDashboard
                players={players}
                picks={picks}
                currentPickerIndex={currentPickerIndex}
                onPoke={handlePoke}
                teams={teams}
              />
              {isDraftComplete && (
                <button className="btn btn-primary" style={{ width: '100%', marginTop: 12 }} onClick={advancePhase}>
                  Advance to Player Selection →
                </button>
              )}
            </div>
          )}
        </div>

        <ConfirmBar
          selectedTeam={selectedTeam}
          onConfirm={confirmPick}
          onCancel={() => setSelectedTeam(null)}
        />
      </div>
    );
  }

  // ── SELECTING PLAYERS ──
  if (game.status === 'selecting_players') {
    const tabs = myDraftPicks.map((pick) => {
      const team = teams.find((t) => t.api_id === pick.team_api_id);
      return { pick, team };
    });

    const currentTab = tabs[selectedTab];
    const currentTeamId = currentTab?.pick?.team_api_id;
    const currentSquad = squadPlayers[currentTeamId] || [];
    const currentSelected = selectedPlayers[currentTeamId] || [];

    function togglePlayer(playerApiId) {
      const current = selectedPlayers[currentTeamId] || [];
      if (current.includes(playerApiId)) {
        setSelectedPlayers((prev) => ({
          ...prev,
          [currentTeamId]: current.filter((id) => id !== playerApiId),
        }));
      } else if (current.length < 3) {
        setSelectedPlayers((prev) => ({
          ...prev,
          [currentTeamId]: [...current, playerApiId],
        }));
      }
    }

    const allTeamsDone = tabs.every((tab) => {
      const sel = selectedPlayers[tab.pick.team_api_id] || [];
      return sel.length === 3;
    });

    return (
      <div className="page">
        <PokeToast message={showPoke ? pokeMessage : ''} onDismiss={dismissPoke} />

        <div className="page-header">
          <h1 className="page-title">Select Players</h1>
          <span className="badge badge-muted">3 per team</span>
        </div>

        {tabs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🤔</div>
            <p>You have no draft picks yet.</p>
          </div>
        ) : (
          <>
            <div className="tabs mb-16">
              {tabs.map((tab, i) => (
                <button
                  key={tab.pick.team_api_id}
                  className={`tab${selectedTab === i ? ' active' : ''}`}
                  onClick={() => setSelectedTab(i)}
                >
                  {tab.team?.name || tab.pick.team_api_id}
                  {' '}
                  ({(selectedPlayers[tab.pick.team_api_id] || []).length}/3)
                </button>
              ))}
            </div>

            {currentTab && (
              <div>
                <div className="mb-12">
                  <span className="section-title">
                    {currentTab.team?.name || currentTeamId} — Pick 3 players ({currentSelected.length}/3)
                  </span>
                </div>
                {currentSquad.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">🔍</div>
                    <p>No players found for this team in the database.</p>
                    <p className="text-sm mt-8">Run the backfill script to populate player data.</p>
                  </div>
                ) : (
                  <div className="grid-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))' }}>
                    {currentSquad.map((player) => {
                      const isSelected = currentSelected.includes(player.api_id);
                      const isDisabled = !isSelected && currentSelected.length >= 3;
                      return (
                        <div key={player.api_id} style={{ opacity: isDisabled ? 0.45 : 1 }}>
                          <PlayerCard
                            player={player}
                            selected={isSelected}
                            onClick={!isDisabled ? () => togglePlayer(player.api_id) : undefined}
                            showPosition
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <div className="divider mt-24" />
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', alignItems: 'center', paddingTop: 16 }}>
              <span className="text-muted text-sm">
                {allTeamsDone ? '✓ All teams done!' : 'Select 3 players per team'}
              </span>
              <button
                className="btn btn-primary"
                onClick={savePlayerPicks}
                disabled={savingPlayers || !allTeamsDone}
              >
                {savingPlayers ? 'Saving...' : 'Save Player Picks'}
              </button>
            </div>

            {isHost && (
              <div className="card mt-16">
                <div className="card-title">Host Controls</div>
                <button className="btn btn-secondary" onClick={advancePhase}>
                  Advance to Captain Selection →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  // ── SELECTING CAPTAIN ──
  if (game.status === 'selecting_captain') {
    // Build player objects from saved picks
    const [allPlayers, setAllPlayers] = React.useState([]);

    React.useEffect(() => {
      if (savedPlayerPicks.length === 0) return;
      const ids = savedPlayerPicks.map((p) => p.player_api_id);
      supabase.from('players').select('*').in('api_id', ids).then(({ data }) => {
        if (data) setAllPlayers(data);
      });
    }, [savedPlayerPicks]);

    const effectiveCaptain = captainId || savedCaptain;

    return (
      <div className="page">
        <PokeToast message={showPoke ? pokeMessage : ''} onDismiss={dismissPoke} />

        <div className="page-header">
          <h1 className="page-title">Pick Your Captain</h1>
          {savedCaptain && <span className="badge badge-success">Saved</span>}
        </div>

        <p className="text-muted mb-16">
          Your captain's points are doubled. Choose wisely!
        </p>

        <CaptainGrid
          playerPicks={allPlayers}
          captainPickId={effectiveCaptain}
          onSelectCaptain={setCaptainId}
        />

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', paddingTop: 24 }}>
          <button
            className="btn btn-primary"
            onClick={saveCaptain}
            disabled={savingCaptain || !captainId}
          >
            {savingCaptain ? 'Saving...' : 'Confirm Captain'}
          </button>
        </div>

        {isHost && (
          <div className="card mt-16">
            <div className="card-title">Host Controls</div>
            <p className="text-muted text-sm mb-12">
              Once everyone has selected their captain, start the tournament.
            </p>
            <button className="btn btn-primary" onClick={advancePhase}>
              Start Tournament →
            </button>
          </div>
        )}
      </div>
    );
  }

  // Fallback
  return (
    <div className="loader-center">
      <div className="spinner" />
    </div>
  );
}
