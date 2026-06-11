import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGame } from '../hooks/useGame';
import { usePlayers } from '../hooks/usePlayers';
import { useDraft } from '../hooks/useDraft';
import { useNotifications } from '../hooks/useNotifications';
import { supabase } from '../lib/supabase';
import { getOrCreateToken } from '../lib/session';
import { getCurrentPicker, getPotFromPickNumber } from '../lib/draft';
import { FALLBACK_POTS } from '../lib/constants';
import TeamCard from '../components/TeamCard';
import SnakeOrderBar from '../components/SnakeOrderBar';
import ConfirmBar from '../components/ConfirmBar';
import HostDashboard from '../components/HostDashboard';
import PokeToast from '../components/PokeToast';
import PlayerCard from '../components/PlayerCard';
import CaptainGrid from '../components/CaptainGrid';

const POSITIONS = ['FWD', 'MID', 'DEF'];

export default function DraftView() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const { game, loading: gameLoading } = useGame(gameId);
  const { players, loading: playersLoading } = usePlayers(gameId);
  const { picks, loading: picksLoading } = useDraft(gameId);

  const myToken = getOrCreateToken();

  const myPlayer = useMemo(() => players.find((p) => p.session_token === myToken) || null, [players, myToken]);
  const isHost = game && game.host_session_token === myToken;

  const { toastMessage, dismissToast } = useNotifications(gameId, myPlayer?.id);

  // Teams from DB
  const [teamsDb, setTeamsDb] = useState([]);
  useEffect(() => {
    supabase.from('teams').select('*').then(({ data }) => setTeamsDb(data || []));
  }, []);

  // Teams map: api_id → team
  const teamsMap = useMemo(() => {
    const m = {};
    teamsDb.forEach((t) => { m[t.api_id] = t; });
    return m;
  }, [teamsDb]);

  // Player picks from DB
  const [playerPicksDb, setPlayerPicksDb] = useState([]);
  useEffect(() => {
    if (!gameId) return;
    async function loadPP() {
      const { data } = await supabase.from('player_picks').select('*').eq('game_id', gameId);
      setPlayerPicksDb(data || []);
    }
    loadPP();
    const ch = supabase.channel(`pp:${gameId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'player_picks', filter: `game_id=eq.${gameId}` }, () => loadPP())
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [gameId]);

  // All players (for player selection phase)
  const [availablePlayers, setAvailablePlayers] = useState([]);
  const [playersLoaded, setPlayersLoaded] = useState(false);

  // Captain picks
  const [captainPicks, setCaptainPicks] = useState([]);
  useEffect(() => {
    if (!gameId) return;
    async function loadCaps() {
      const { data } = await supabase.from('captain_picks').select('*').eq('game_id', gameId);
      setCaptainPicks(data || []);
    }
    loadCaps();
    const ch = supabase.channel(`caps:${gameId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'captain_picks', filter: `game_id=eq.${gameId}` }, () => loadCaps())
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [gameId]);

  // UI state
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [error, setError] = useState('');

  // Player selection state
  const [currentTeamIndex, setCurrentTeamIndex] = useState(0);
  const [currentPositionIndex, setCurrentPositionIndex] = useState(0);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [positionFilter, setPositionFilter] = useState(null);

  // Captain selection state
  const [selectedCaptainPpId, setSelectedCaptainPpId] = useState(null);
  const [captainLoading, setCaptainLoading] = useState(false);

  // Redirect when tournament starts
  useEffect(() => {
    if (game && (game.status === 'tournament' || game.status === 'complete')) {
      navigate(`/leaderboard/${gameId}`, { replace: true });
    }
  }, [game, gameId, navigate]);

  // Computed: sorted players for snake draft
  const sortedPlayers = useMemo(
    () => [...players].sort((a, b) => a.draft_order - b.draft_order),
    [players]
  );

  const currentPicker = useMemo(
    () => getCurrentPicker(picks, sortedPlayers),
    [picks, sortedPlayers]
  );

  const currentPickerIndex = useMemo(
    () => sortedPlayers.findIndex((p) => p.id === currentPicker?.id),
    [sortedPlayers, currentPicker]
  );

  const isMyTurn = currentPicker && myPlayer && currentPicker.id === myPlayer.id;

  // Current pot being drafted
  const currentPot = useMemo(
    () => game ? getPotFromPickNumber(picks.length, sortedPlayers.length) : 1,
    [game, picks.length, sortedPlayers.length]
  );

  // Which teams are taken?
  const takenTeamApiIds = useMemo(() => picks.map((p) => p.team_api_id), [picks]);
  const takenByMap = useMemo(() => {
    const m = {};
    picks.forEach((p) => {
      const player = sortedPlayers.find((pl) => pl.id === p.player_id);
      m[p.team_api_id] = player?.name || '?';
    });
    return m;
  }, [picks, sortedPlayers]);

  // Teams for current pot
  const potTeams = useMemo(() => {
    if (teamsDb.length > 0) {
      return teamsDb.filter((t) => t.pot === currentPot);
    }
    // Fallback to constants
    const names = FALLBACK_POTS[currentPot] || [];
    return names.map((name, i) => ({ api_id: `pot${currentPot}_${i}`, name, pot: currentPot, logo_url: null }));
  }, [teamsDb, currentPot]);

  // My draft picks
  const myPicks = useMemo(
    () => picks.filter((p) => p.player_id === myPlayer?.id),
    [picks, myPlayer]
  );

  // Load available players when entering player selection phase
  useEffect(() => {
    if (game?.status !== 'selecting_players' || playersLoaded) return;
    async function loadPlayers() {
      const teamApiIds = myPicks.map((p) => p.team_api_id);
      if (teamApiIds.length === 0) return;
      const { data } = await supabase
        .from('players')
        .select('*')
        .in('team_api_id', teamApiIds)
        .neq('position', 'GK');
      setAvailablePlayers(data || []);
      setPlayersLoaded(true);
    }
    loadPlayers();
  }, [game?.status, myPicks, playersLoaded]);

  // All players map for captain grid
  const allPlayersMap = useMemo(() => {
    const m = {};
    availablePlayers.forEach((p) => { m[p.api_id] = p; });
    return m;
  }, [availablePlayers]);

  // My player picks
  const myPlayerPicks = useMemo(
    () => playerPicksDb.filter((pp) => pp.game_player_id === myPlayer?.id),
    [playerPicksDb, myPlayer]
  );

  // Player picks by draft_pick_id
  const ppByDraftPickId = useMemo(() => {
    const m = {};
    myPlayerPicks.forEach((pp) => {
      if (!m[pp.draft_pick_id]) m[pp.draft_pick_id] = {};
      m[pp.draft_pick_id][pp.position] = pp;
    });
    return m;
  }, [myPlayerPicks]);

  // Determine which team/position to fill next
  const nextSlot = useMemo(() => {
    for (let ti = 0; ti < myPicks.length; ti++) {
      const pick = myPicks[ti];
      const filled = ppByDraftPickId[pick.id] || {};
      for (const pos of POSITIONS) {
        if (!filled[pos]) return { teamIndex: ti, position: pos, pick };
      }
    }
    return null;
  }, [myPicks, ppByDraftPickId]);

  // My captain pick
  const myCaptainPick = useMemo(
    () => captainPicks.find((cp) => cp.game_player_id === myPlayer?.id) || null,
    [captainPicks, myPlayer]
  );

  async function handleConfirmTeamPick() {
    if (!selectedTeam || !isMyTurn || confirmLoading) return;
    setConfirmLoading(true);
    setError('');
    try {
      const { error: err } = await supabase.from('draft_picks').insert({
        game_id: gameId,
        player_id: myPlayer.id,
        team_api_id: selectedTeam.api_id,
        pot: currentPot,
        pick_number: picks.length,
      });
      if (err) throw err;

      // Advance pick number
      const newPickNumber = picks.length + 1;
      const totalPicks = sortedPlayers.length * 8;
      const nextStatus = newPickNumber >= totalPicks ? 'selecting_players' : 'drafting_teams';

      await supabase.from('games').update({
        current_pick_number: newPickNumber,
        ...(nextStatus !== 'drafting_teams' ? { status: nextStatus } : {}),
      }).eq('id', gameId);

      setSelectedTeam(null);
    } catch (err) {
      setError(err.message || 'Failed to pick team');
    } finally {
      setConfirmLoading(false);
    }
  }

  async function handleConfirmPlayerPick() {
    if (!selectedPlayer || !nextSlot || confirmLoading) return;
    setConfirmLoading(true);
    setError('');
    try {
      const { error: err } = await supabase.from('player_picks').insert({
        game_id: gameId,
        game_player_id: myPlayer.id,
        draft_pick_id: nextSlot.pick.id,
        player_api_id: selectedPlayer.api_id,
        position: nextSlot.position,
      });
      if (err) throw err;
      setSelectedPlayer(null);

      // Check if all players done
      const totalExpected = myPicks.length * 3;
      const newCount = myPlayerPicks.length + 1;
      if (newCount >= totalExpected) {
        // Check if ALL game_players are done
        const { data: allPP } = await supabase
          .from('player_picks')
          .select('id')
          .eq('game_id', gameId);
        const expectedTotal = picks.length * 3;
        if ((allPP?.length || 0) + 1 >= expectedTotal) {
          await supabase.from('games').update({ status: 'selecting_captain' }).eq('id', gameId);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to pick player');
    } finally {
      setConfirmLoading(false);
    }
  }

  async function handleConfirmCaptain() {
    if (!selectedCaptainPpId || captainLoading || myCaptainPick) return;
    setCaptainLoading(true);
    setError('');
    try {
      const { error: err } = await supabase.from('captain_picks').insert({
        game_id: gameId,
        game_player_id: myPlayer.id,
        player_pick_id: selectedCaptainPpId,
      });
      if (err) throw err;

      // Check if all players have picked captain
      const { data: allCaps } = await supabase
        .from('captain_picks')
        .select('id')
        .eq('game_id', gameId);
      const totalPlayers = sortedPlayers.length;
      if ((allCaps?.length || 0) + 1 >= totalPlayers) {
        await supabase.from('games').update({ status: 'tournament' }).eq('id', gameId);
      }
    } catch (err) {
      setError(err.message || 'Failed to set captain');
    } finally {
      setCaptainLoading(false);
    }
  }

  async function handlePoke(playerId) {
    if (!playerId) return;
    await supabase.from('notifications').insert({
      game_id: gameId,
      game_player_id: playerId,
      type: 'poke',
      message: `${myPlayer?.name || 'The host'} is waiting for you to pick! 👋`,
      read: false,
    });
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
    return (
      <div className="loading-screen">
        <p className="text-danger">Game not found.</p>
      </div>
    );
  }

  const status = game.status;

  return (
    <div style={{ paddingBottom: 80 }}>
      <PokeToast message={toastMessage} onDismiss={dismissToast} />

      {/* Header */}
      <div className="nav">
        <span className="nav-logo">Copa Fantasy</span>
        <div className="flex items-center gap-2">
          {status === 'drafting_teams' && (
            <span className="badge badge-gold">Pot {currentPot}</span>
          )}
          <span className="badge badge-muted">{game.code}</span>
        </div>
      </div>

      <div className="page" style={{ paddingTop: 16 }}>
        <div className="container">
          {error && (
            <div style={{ background: 'rgba(217,83,79,0.12)', border: '1px solid var(--danger)', borderRadius: 8, padding: '10px 14px', color: 'var(--danger)', fontSize: '0.85rem', marginBottom: 12 }}>
              {error}
            </div>
          )}

          {/* TEAM DRAFT PHASE */}
          {status === 'drafting_teams' && (
            <>
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h2>Team Draft</h2>
                  <span className="text-sm text-muted">{picks.length} / {game.total_picks} picks</span>
                </div>
                <SnakeOrderBar players={sortedPlayers} currentPickerIndex={currentPickerIndex} myPlayerId={myPlayer?.id} />
              </div>

              {isMyTurn ? (
                <div className="badge badge-success mb-4" style={{ fontSize: '0.85rem', padding: '6px 12px' }}>
                  🎯 Your turn to pick from Pot {currentPot}!
                </div>
              ) : (
                <div className="text-muted text-sm mb-4">
                  Waiting for <strong>{currentPicker?.name}</strong> to pick…
                </div>
              )}

              <div style={{ marginBottom: 8 }}>
                <div className="pot-section__title">Pot {currentPot} Teams</div>
                <div className="team-grid">
                  {potTeams.map((team) => {
                    const taken = takenTeamApiIds.includes(team.api_id);
                    const isSelected = selectedTeam?.api_id === team.api_id;
                    return (
                      <TeamCard
                        key={team.api_id}
                        team={team}
                        selected={isSelected}
                        taken={taken}
                        takenBy={taken ? takenByMap[team.api_id] : null}
                        onClick={() => isMyTurn && setSelectedTeam(isSelected ? null : team)}
                        disabled={!isMyTurn}
                      />
                    );
                  })}
                </div>
              </div>

              {isHost && (
                <HostDashboard
                  players={sortedPlayers}
                  picks={picks}
                  currentPicker={currentPicker}
                  onPoke={handlePoke}
                  teams={teamsMap}
                />
              )}

              <ConfirmBar
                selectedTeam={selectedTeam}
                onConfirm={handleConfirmTeamPick}
                onCancel={() => setSelectedTeam(null)}
                loading={confirmLoading}
              />
            </>
          )}

          {/* PLAYER SELECTION PHASE */}
          {status === 'selecting_players' && (
            <>
              <div className="mb-4">
                <h2 className="mb-2">Select Players</h2>
                <p className="text-sm text-muted">Pick 1 FWD, 1 MID, and 1 DEF for each of your 8 teams.</p>
              </div>

              {nextSlot ? (
                <>
                  <div style={{ background: 'var(--navy-3)', borderRadius: 8, padding: '12px 16px', marginBottom: 16 }}>
                    <div className="text-xs text-muted mb-1">Now picking for</div>
                    <div className="font-bold" style={{ color: 'var(--gold)' }}>
                      {teamsMap[nextSlot.pick.team_api_id]?.name || `Team ${nextSlot.pick.team_api_id}`}
                      <span style={{ marginLeft: 8, color: 'var(--text)' }}>— {nextSlot.position}</span>
                    </div>
                    <div className="text-xs text-muted mt-1">
                      Team {myPicks.findIndex((p) => p.id === nextSlot.pick.id) + 1} of {myPicks.length}
                    </div>
                  </div>

                  {/* Position filter */}
                  <div className="flex gap-2 mb-3" style={{ flexWrap: 'wrap' }}>
                    {['All', 'FWD', 'MID', 'DEF'].map((pos) => (
                      <button
                        key={pos}
                        className={`btn btn-sm ${positionFilter === (pos === 'All' ? null : pos) || (pos === 'All' && !positionFilter) ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => setPositionFilter(pos === 'All' ? null : pos)}
                      >
                        {pos}
                      </button>
                    ))}
                  </div>

                  {/* Available players */}
                  {!playersLoaded ? (
                    <div className="loading-screen" style={{ minHeight: 200 }}>
                      <div className="spinner" />
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: '50vh', overflowY: 'auto' }}>
                      {availablePlayers
                        .filter((p) => {
                          if (positionFilter && p.position !== positionFilter) return false;
                          // Filter to current team if needed; allow all team's players
                          return p.team_api_id === nextSlot.pick.team_api_id;
                        })
                        .filter((p) => {
                          // Not already picked
                          const alreadyPicked = playerPicksDb.some((pp) => pp.player_api_id === p.api_id && pp.game_player_id === myPlayer?.id);
                          return !alreadyPicked;
                        })
                        .map((p) => (
                          <PlayerCard
                            key={p.api_id}
                            player={p}
                            selected={selectedPlayer?.api_id === p.api_id}
                            onClick={() => setSelectedPlayer(selectedPlayer?.api_id === p.api_id ? null : p)}
                            showPosition
                          />
                        ))
                      }
                    </div>
                  )}

                  {selectedPlayer && (
                    <div className="confirm-bar confirm-bar--visible">
                      <div style={{ flex: 1 }}>
                        <div className="text-xs text-muted mb-1">Pick as {nextSlot.position}</div>
                        <div className="font-bold">{selectedPlayer.name}</div>
                      </div>
                      <button className="btn btn-ghost btn-sm" onClick={() => setSelectedPlayer(null)}>Cancel</button>
                      <button className="btn btn-primary btn-sm" onClick={handleConfirmPlayerPick} disabled={confirmLoading}>
                        {confirmLoading ? '…' : 'Confirm'}
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="empty-state">
                  <span className="emoji-big">✅</span>
                  <div className="font-bold mb-2">All players selected!</div>
                  <p className="text-muted text-sm">Waiting for other players to finish…</p>
                </div>
              )}
            </>
          )}

          {/* CAPTAIN SELECTION PHASE */}
          {status === 'selecting_captain' && (
            <>
              <div className="mb-4">
                <h2 className="mb-2">Choose Your Captain</h2>
                <p className="text-sm text-muted">Your captain scores 2× all their points for the tournament.</p>
              </div>

              {myCaptainPick ? (
                <div className="empty-state">
                  <span className="emoji-big">🎖️</span>
                  <div className="font-bold mb-2">Captain selected!</div>
                  <p className="text-muted text-sm">Waiting for other players to choose their captains…</p>
                </div>
              ) : (
                <>
                  <CaptainGrid
                    playerPicks={myPlayerPicks}
                    captainPickId={selectedCaptainPpId}
                    onSelectCaptain={(ppId) => setSelectedCaptainPpId(ppId === selectedCaptainPpId ? null : ppId)}
                    allPlayers={allPlayersMap}
                    picks={myPicks}
                  />

                  {selectedCaptainPpId && (
                    <div style={{ marginTop: 20, textAlign: 'center' }}>
                      <button
                        className="btn btn-primary"
                        onClick={handleConfirmCaptain}
                        disabled={captainLoading}
                        style={{ minWidth: 200 }}
                      >
                        {captainLoading ? 'Confirming…' : '🎖️ Confirm Captain'}
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
