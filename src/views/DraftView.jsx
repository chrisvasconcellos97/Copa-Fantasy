import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGame } from '../hooks/useGame';
import { usePlayers } from '../hooks/usePlayers';
import { useDraft } from '../hooks/useDraft';
import { useNotifications } from '../hooks/useNotifications';
import { supabase } from '../lib/supabase';
import { getSnakeOrder, getCurrentPicker, getPotFromPickNumber } from '../lib/draft';
import { FALLBACK_POTS } from '../lib/constants';
import TeamCard from '../components/TeamCard';
import SnakeOrderBar from '../components/SnakeOrderBar';
import ConfirmBar from '../components/ConfirmBar';
import HostDashboard from '../components/HostDashboard';
import PokeToast from '../components/PokeToast';
import PlayerCard from '../components/PlayerCard';
import CaptainGrid from '../components/CaptainGrid';
import SquadBuilder from '../components/SquadBuilder';

export default function DraftView() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const { game, loading: gameLoading } = useGame(gameId);
  const { players, loading: playersLoading } = usePlayers(gameId);
  const { picks, loading: picksLoading } = useDraft(gameId);
  
  const myPlayerId = localStorage.getItem('copa_player_id');
  const hostToken = localStorage.getItem('copa_host_token');
  const isHost = game && hostToken && game.host_token === hostToken;

  const { showPoke, dismissPoke, pokeMessage } = useNotifications(myPlayerId);

  // Teams state
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [confirming, setConfirming] = useState(false);

  // Player picks state
  const [dbPlayers, setDbPlayers] = useState([]);
  const [selectedTeamTab, setSelectedTeamTab] = useState(null);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState({});
  const [savingPlayers, setSavingPlayers] = useState(false);
  const [playerPicks, setPlayerPicks] = useState([]);

  // Captain state
  const [captainPickId, setCaptainPickId] = useState(null);
  const [savingCaptain, setSavingCaptain] = useState(false);

  const [advancingPhase, setAdvancingPhase] = useState(false);

  // Load teams from DB or fallback
  useEffect(() => {
    async function loadTeams() {
      const { data } = await supabase.from('teams').select('*');
      if (data && data.length > 0) {
        setTeams(data);
      } else {
        // Build teams array from FALLBACK_POTS
        const fallbackTeams = [];
        for (const [pot, names] of Object.entries(FALLBACK_POTS)) {
          for (const name of names) {
            fallbackTeams.push({ api_id: name.toLowerCase().replace(/\s/g, '-'), name, pot: Number(pot), logo_url: null });
          }
        }
        setTeams(fallbackTeams);
      }
    }
    loadTeams();
  }, []);

  // Load player_picks for this game
  useEffect(() => {
    if (!gameId) return;
    supabase.from('player_picks').select('*').eq('game_id', gameId).then(({ data }) => {
      setPlayerPicks(data || []);
    });
    const sub = supabase.channel('player-picks-' + gameId)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'player_picks', filter: 'game_id=eq.' + gameId },
        () => {
          supabase.from('player_picks').select('*').eq('game_id', gameId).then(({ data }) => setPlayerPicks(data || []));
        })
      .subscribe();
    return () => supabase.removeChannel(sub);
  }, [gameId]);

  // Load captain pick
  useEffect(() => {
    if (!gameId || !myPlayerId) return;
    supabase.from('captain_picks').select('*').eq('game_id', gameId).eq('game_player_id', myPlayerId).single()
      .then(({ data }) => { if (data) setCaptainPickId(data.player_api_id); });
  }, [gameId, myPlayerId]);

  // Navigate on phase change
  useEffect(() => {
    if (game && (game.status === 'tournament' || game.status === 'complete')) {
      navigate('/leaderboard/' + gameId, { replace: true });
    }
  }, [game, gameId, navigate]);

  // Compute current picker
  const currentPicker = useMemo(() => {
    if (!players.length) return null;
    return getCurrentPicker(picks, players);
  }, [picks, players]);

  const currentPickerIndex = useMemo(() => {
    if (!currentPicker) return -1;
    return players.findIndex((p) => p.id === currentPicker.id);
  }, [currentPicker, players]);

  const isMyTurn = currentPicker?.id === myPlayerId;

  // Teams map
  const teamsById = useMemo(() => {
    const m = {};
    teams.forEach((t) => { m[t.api_id] = t; });
    return m;
  }, [teams]);

  // My draft picks
  const myDraftPicks = picks.filter((p) => p.game_player_id === myPlayerId);
  const myTeamApiIds = myDraftPicks.map((p) => p.team_api_id);

  // Taken teams map: api_id -> player name
  const takenTeamsMap = useMemo(() => {
    const m = {};
    picks.forEach((pk) => {
      const player = players.find((p) => p.id === pk.game_player_id);
      m[pk.team_api_id] = player?.player_name || player?.name || 'Taken';
    });
    return m;
  }, [picks, players]);

  // Current pot being drafted
  const currentPot = currentPicker
    ? getPotFromPickNumber(picks.length + 1, players.length)
    : null;

  // Filter teams by current pot for drafting
  const teamsForCurrentPot = currentPot
    ? teams.filter((t) => t.pot === currentPot)
    : teams;

  async function handleConfirmPick() {
    if (!selectedTeam || !isMyTurn || confirming) return;
    setConfirming(true);
    try {
      const { error } = await supabase.from('draft_picks').insert({
        game_id: gameId,
        game_player_id: myPlayerId,
        pick_number: picks.length + 1,
        team_api_id: selectedTeam.api_id,
      });
      if (error) throw error;
      setSelectedTeam(null);
    } catch (e) {
      console.error('Pick error:', e);
    }
    setConfirming(false);
  }

  async function handlePoke(playerId) {
    await supabase.from('notifications').insert({
      game_player_id: playerId,
      type: 'poke',
      message: "It's your turn to pick! 🎯",
      read: false,
    });
  }

  async function advancePhase() {
    if (!isHost || advancingPhase) return;
    setAdvancingPhase(true);
    const phaseMap = {
      'drafting_teams': 'selecting_players',
      'selecting_players': 'selecting_captain',
      'selecting_captain': 'tournament',
    };
    const nextPhase = phaseMap[game.status];
    if (nextPhase) {
      await supabase.from('games').update({ status: nextPhase }).eq('id', gameId);
    }
    setAdvancingPhase(false);
  }

  // Load players for team tab (selecting_players phase)
  async function loadPlayersForTeam(teamApiId) {
    setSelectedTeamTab(teamApiId);
    if (!dbPlayers.find((p) => p.team_api_id === teamApiId)) {
      const { data } = await supabase.from('players').select('*').eq('team_api_id', teamApiId);
      setDbPlayers((prev) => [...prev, ...(data || [])]);
    }
  }

  async function savePlayerPicks() {
    setSavingPlayers(true);
    try {
      for (const [teamApiId, playerApiIds] of Object.entries(selectedPlayerIds)) {
        for (const playerApiId of playerApiIds) {
          await supabase.from('player_picks').upsert({
            game_id: gameId,
            game_player_id: myPlayerId,
            player_api_id: playerApiId,
            team_api_id: teamApiId,
          }, { onConflict: 'game_id,game_player_id,player_api_id' });
        }
      }
    } catch (e) {
      console.error('Save players error:', e);
    }
    setSavingPlayers(false);
  }

  async function saveCaptain(playerApiId) {
    setSavingCaptain(true);
    try {
      await supabase.from('captain_picks').upsert({
        game_id: gameId,
        game_player_id: myPlayerId,
        player_api_id: playerApiId,
      }, { onConflict: 'game_id,game_player_id' });
      setCaptainPickId(playerApiId);
    } catch (e) {
      console.error('Save captain error:', e);
    }
    setSavingCaptain(false);
  }

  if (gameLoading || playersLoading || picksLoading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p>Loading draft…</p>
      </div>
    );
  }

  if (!game) {
    return <div className="view"><div className="error-msg">Game not found.</div></div>;
  }

  // ─── DRAFTING TEAMS PHASE ───────────────────────────────────────────────
  if (game.status === 'drafting_teams') {
    const allDone = myDraftPicks.length >= 8;
    return (
      <div className="view">
        {showPoke && <PokeToast message={pokeMessage} onDismiss={dismissPoke} />}

        <div style={{ marginBottom: 8 }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--gold)' }}>
            Team Draft
          </h2>
          {currentPot && (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
              Pot {currentPot} · {isMyTurn ? "Your turn!" : `Waiting for ${currentPicker?.player_name || currentPicker?.name}…`}
            </p>
          )}
        </div>

        <SnakeOrderBar players={players} currentPickerIndex={currentPickerIndex} myPlayerId={myPlayerId} />

        <div style={{ marginBottom: 12 }}>
          <SquadBuilder picks={picks} teams={teams} myPlayerId={myPlayerId} />
        </div>

        {isHost && (
          <HostDashboard
            players={players}
            picks={picks}
            currentPickerIndex={currentPickerIndex}
            onPoke={handlePoke}
            teams={teams}
          />
        )}

        {!allDone && (
          <>
            <div className="section-header" style={{ marginBottom: 10 }}>
              {isMyTurn ? '✨ Select a team' : 'Teams available'}
              {currentPot && <span style={{ marginLeft: 8 }}>— Pot {currentPot}</span>}
            </div>
            <div className="team-grid">
              {teamsForCurrentPot.map((team) => {
                const taken = !!takenTeamsMap[team.api_id];
                const takenBy = takenTeamsMap[team.api_id];
                const sel = selectedTeam?.api_id === team.api_id;
                return (
                  <TeamCard
                    key={team.api_id}
                    team={team}
                    selected={sel}
                    taken={taken}
                    takenBy={taken ? takenBy : undefined}
                    onClick={isMyTurn ? (t) => setSelectedTeam(sel ? null : t) : undefined}
                    disabled={!isMyTurn}
                  />
                );
              })}
            </div>
          </>
        )}

        {allDone && !isHost && (
          <div className="empty-state">
            <div style={{ fontSize: '2rem', marginBottom: 8 }}>✅</div>
            <p>You've drafted all 8 teams!</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 6 }}>
              Waiting for others to finish…
            </p>
          </div>
        )}

        {isHost && (
          <div style={{ marginTop: 16 }}>
            <button
              className="btn-secondary"
              onClick={advancePhase}
              disabled={advancingPhase}
              style={{ width: '100%' }}
            >
              {advancingPhase ? 'Advancing…' : 'Host: Advance to Player Selection →'}
            </button>
          </div>
        )}

        {selectedTeam && isMyTurn && (
          <ConfirmBar
            selectedTeam={selectedTeam}
            onConfirm={handleConfirmPick}
            onCancel={() => setSelectedTeam(null)}
          />
        )}
      </div>
    );
  }

  // ─── SELECTING PLAYERS PHASE ─────────────────────────────────────────────
  if (game.status === 'selecting_players') {
    const myPlayerPicks = playerPicks.filter((pp) => pp.game_player_id === myPlayerId);
    const teamPlayersForTab = selectedTeamTab
      ? dbPlayers.filter((p) => p.team_api_id === selectedTeamTab)
      : [];
    const picksForTab = myPlayerPicks.filter((pp) => pp.team_api_id === selectedTeamTab);
    const selectedForTab = selectedPlayerIds[selectedTeamTab] || [];

    return (
      <div className="view">
        {showPoke && <PokeToast message={pokeMessage} onDismiss={dismissPoke} />}
        <div style={{ marginBottom: 12 }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--gold)' }}>Pick Players</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
            Choose 3 players from each of your 8 teams
          </p>
        </div>

        {/* Team tabs */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 12, paddingBottom: 4 }}>
          {myDraftPicks.map((pick) => {
            const t = teamsById[pick.team_api_id];
            const done = myPlayerPicks.filter((pp) => pp.team_api_id === pick.team_api_id).length >= 3;
            return (
              <button
                key={pick.team_api_id}
                onClick={() => loadPlayersForTeam(pick.team_api_id)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 999,
                  border: `1px solid ${selectedTeamTab === pick.team_api_id ? 'var(--gold)' : 'var(--border)'}`,
                  background: selectedTeamTab === pick.team_api_id ? 'rgba(255,215,0,0.1)' : 'var(--card-bg)',
                  color: selectedTeamTab === pick.team_api_id ? 'var(--gold)' : 'var(--text)',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  flexShrink: 0,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {done ? '✅ ' : ''}{t?.name || pick.team_api_id}
              </button>
            );
          })}
        </div>

        {selectedTeamTab && (
          <>
            <div className="section-header">
              {teamsById[selectedTeamTab]?.name} — select up to 3 players
              <span style={{ float: 'right' }}>
                {picksForTab.length + selectedForTab.length}/3
              </span>
            </div>
            {teamPlayersForTab.length === 0 ? (
              <div className="empty-state"><div className="spinner" /></div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 8, marginBottom: 80 }}>
                {teamPlayersForTab.map((player) => {
                  const alreadySaved = picksForTab.find((pp) => pp.player_api_id === player.api_id);
                  const localSelected = selectedForTab.includes(player.api_id);
                  return (
                    <PlayerCard
                      key={player.api_id}
                      player={player}
                      selected={!!alreadySaved || localSelected}
                      showPosition
                      onClick={() => {
                        if (alreadySaved) return;
                        setSelectedPlayerIds((prev) => {
                          const cur = prev[selectedTeamTab] || [];
                          if (cur.includes(player.api_id)) {
                            return { ...prev, [selectedTeamTab]: cur.filter((id) => id !== player.api_id) };
                          }
                          if (cur.length + picksForTab.length >= 3) return prev;
                          return { ...prev, [selectedTeamTab]: [...cur, player.api_id] };
                        });
                      }}
                    />
                  );
                })}
              </div>
            )}
            {Object.values(selectedPlayerIds).some((arr) => arr.length > 0) && (
              <div style={{
                position: 'fixed', bottom: 65, left: 0, right: 0,
                background: 'var(--card-bg)', borderTop: '2px solid var(--gold)',
                padding: '12px 16px', display: 'flex', gap: 10, zIndex: 90,
              }}>
                <button className="btn-gold" onClick={savePlayerPicks} disabled={savingPlayers} style={{ flex: 1 }}>
                  {savingPlayers ? 'Saving…' : 'Save Player Picks'}
                </button>
              </div>
            )}
          </>
        )}

        {!selectedTeamTab && (
          <div className="empty-state">
            <p>Select a team above to pick players</p>
          </div>
        )}

        {isHost && (
          <div style={{ marginTop: 16 }}>
            <button className="btn-secondary" onClick={advancePhase} disabled={advancingPhase} style={{ width: '100%' }}>
              {advancingPhase ? 'Advancing…' : 'Host: Advance to Captain Selection →'}
            </button>
          </div>
        )}
      </div>
    );
  }

  // ─── SELECTING CAPTAIN PHASE ──────────────────────────────────────────────
  if (game.status === 'selecting_captain') {
    const myPlayerPicks = playerPicks.filter((pp) => pp.game_player_id === myPlayerId);
    // Enrich player picks with player data
    const enrichedPicks = myPlayerPicks.map((pp) => {
      const p = dbPlayers.find((dp) => dp.api_id === pp.player_api_id) || {};
      const team = teamsById[pp.team_api_id];
      return {
        ...p,
        ...pp,
        player_api_id: pp.player_api_id,
        team_name: team?.name,
      };
    });

    return (
      <div className="view">
        {showPoke && <PokeToast message={pokeMessage} onDismiss={dismissPoke} />}
        <div style={{ marginBottom: 12 }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--gold)' }}>Choose Captain</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
            Your captain earns 2× points. Choose wisely!
          </p>
        </div>

        {captainPickId && (
          <div style={{
            background: 'rgba(255,215,0,0.08)', border: '1px solid var(--gold)',
            borderRadius: 'var(--radius-sm)', padding: '10px 14px',
            marginBottom: 12, fontSize: '0.85rem', color: 'var(--gold)', fontWeight: 600,
          }}>
            👑 Captain selected! {savingCaptain ? 'Saving…' : ''}
          </div>
        )}

        {myPlayerPicks.length === 0 ? (
          <div className="empty-state">
            <p>You haven't picked any players yet.</p>
          </div>
        ) : (
          <CaptainGrid
            playerPicks={enrichedPicks}
            captainPickId={captainPickId}
            onSelectCaptain={saveCaptain}
          />
        )}

        {isHost && (
          <div style={{ marginTop: 16 }}>
            <button className="btn-secondary" onClick={advancePhase} disabled={advancingPhase} style={{ width: '100%' }}>
              {advancingPhase ? 'Starting…' : 'Host: Start Tournament →'}
            </button>
          </div>
        )}
      </div>
    );
  }

  // Fallback
  return (
    <div className="view">
      <div className="empty-state">
        <p style={{ color: 'var(--text-muted)' }}>
          Current phase: <strong>{game.status}</strong>
        </p>
      </div>
    </div>
  );
}
