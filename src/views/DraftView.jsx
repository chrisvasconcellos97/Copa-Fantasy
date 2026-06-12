import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGame } from '../hooks/useGame';
import { usePlayers } from '../hooks/usePlayers';
import { useDraft } from '../hooks/useDraft';
import { useNotifications } from '../hooks/useNotifications';
import { getSession } from '../lib/session';
import { supabase } from '../lib/supabase';
import { FALLBACK_POTS, normalizePosition } from '../lib/constants';
import { getSnakeOrder, getCurrentPicker } from '../lib/draft';
import { getSquadForTeam } from '../lib/wcSquads';
import TeamCard from '../components/TeamCard';
import Mascot from '../components/Mascot';
import PlayerCard from '../components/PlayerCard';
import ConfirmBar from '../components/ConfirmBar';
import SnakeOrderBar from '../components/SnakeOrderBar';
import HostDashboard from '../components/HostDashboard';
import CaptainGrid from '../components/CaptainGrid';
import PokeToast from '../components/PokeToast';
import SquadBuilder from '../components/SquadBuilder';
import MascotHint from '../components/MascotHint';

function HostSetupDashboard({ players, gameId, totalPicks, onStart, refreshKey }) {
  const [pickCounts, setPickCounts] = React.useState({});
  const [captainCounts, setCaptainCounts] = React.useState({});

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      const [{ data: pp }, { data: cp }] = await Promise.all([
        supabase.from('player_picks').select('game_player_id').eq('game_id', gameId),
        supabase.from('captain_picks').select('game_player_id').eq('game_id', gameId),
      ]);
      if (cancelled) return;
      const pc = {};
      for (const row of pp || []) pc[row.game_player_id] = (pc[row.game_player_id] || 0) + 1;
      const cc = {};
      for (const row of cp || []) cc[row.game_player_id] = 1;
      setPickCounts(pc);
      setCaptainCounts(cc);
    }
    load();
    const interval = setInterval(load, 10000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [gameId, refreshKey]);

  const allDone = players.every(p => (pickCounts[p.id] || 0) >= totalPicks && captainCounts[p.id]);

  return (
    <div className="card mb-16">
      <p style={{ fontWeight: 700, marginBottom: 12, textAlign: 'center' }}>👑 Host Dashboard</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
        {players.map(p => {
          const picks = pickCounts[p.id] || 0;
          const hasCaptain = !!captainCounts[p.id];
          const picksOk = picks >= totalPicks;
          return (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontWeight: 600 }}>{p.player_name}</span>
              <span style={{ display: 'flex', gap: 10, color: 'var(--text-muted)' }}>
                <span style={{ color: picksOk ? 'var(--success)' : 'var(--text-muted)' }}>
                  {picksOk ? '✓' : `${picks}/${totalPicks}`} players
                </span>
                <span style={{ color: hasCaptain ? 'var(--success)' : 'var(--text-muted)' }}>
                  {hasCaptain ? '✓' : '○'} captain
                </span>
              </span>
            </div>
          );
        })}
      </div>
      <button className="btn btn-primary btn-full" onClick={onStart}>
        {allDone ? '🚀 Start Tournament →' : '⚠️ Start Tournament Anyway →'}
      </button>
    </div>
  );
}

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

  // Captain phase: enriched player objects for CaptainGrid
  const [captainPlayers, setCaptainPlayers] = useState([]);
  const [dashRefresh, setDashRefresh] = useState(0);

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
        // Build from fallback pots — use negative numeric IDs to avoid DB integer constraint
        const fallback = [];
        let fakeId = -1;
        for (const [pot, teams] of Object.entries(FALLBACK_POTS)) {
          for (const team of teams) {
            const code = team.name.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 6);
            fallback.push({ api_id: fakeId--, code, name: team.name, logo_url: team.logo || null, pot: parseInt(pot) });
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
    if (game?.status !== 'selecting_players' && game?.status !== 'selecting_captain') return;
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


  // Load players for a team — falls back to hardcoded WC squads if DB is empty
  async function loadTeamPlayers(teamApiId) {
    if (teamPlayers[teamApiId]) return;
    const { data } = await supabase
      .from('players')
      .select('*')
      .eq('team_api_id', String(teamApiId))
      .order('position')
      .order('name');

    let squad;
    if (data && data.length > 0) {
      // Normalize is_top (snake_case from DB) to isTop
      squad = data.map(p => ({ ...p, isTop: p.is_top || p.isTop || false, rating: p.overall ?? p.rating ?? null }));
    } else {
      const team = teams.find(t => String(t.api_id) === String(teamApiId) || t.api_id === teamApiId);
      const raw = team ? getSquadForTeam(team.name) : null;
      squad = raw ? raw.map(p => ({
        api_id: p.id,
        team_api_id: String(teamApiId),
        name: p.name,
        position: p.position,
        photo_url: null,
        number: null,
        isTop: p.isTop || false,
      })) : null;
    }

    if (squad) setTeamPlayers(prev => ({ ...prev, [teamApiId]: squad }));
  }

  // Load enriched player details for captain selection grid
  useEffect(() => {
    if (!['selecting_players', 'selecting_captain'].includes(game?.status) || savedPlayerPicks.length === 0) return;
    const ids = savedPlayerPicks.map(p => p.player_api_id);
    supabase.from('players').select('*').in('api_id', ids).then(({ data }) => {
      if (data) setCaptainPlayers(data.map(p => ({ ...p, isTop: p.is_top || false, rating: p.overall ?? null })));
    });
  }, [game?.status, savedPlayerPicks]);

  // Re-populate checkbox state from DB picks after refresh
  useEffect(() => {
    if (!savedPlayerPicks.length || !picks.length) return;
    setSelectedPlayerIds(prev => {
      const next = { ...prev };
      for (const pp of savedPlayerPicks) {
        const dp = picks.find(p => p.id === pp.draft_pick_id);
        if (!dp) continue;
        const teamId = dp.team_api_id ?? dp.team_code;
        if (!teamId) continue;
        if (!next[teamId]) next[teamId] = [];
        if (!next[teamId].includes(pp.player_api_id)) {
          next[teamId] = [...next[teamId], pp.player_api_id];
        }
      }
      return next;
    });
  }, [savedPlayerPicks, picks]);

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

  const TOTAL_ROUNDS = game?.teams_per_player ?? 8;
  const PICKS_PER_TEAM = game?.players_per_team ?? 3;

  const snakeOrder = getSnakeOrder(players, TOTAL_ROUNDS);
  const currentPickerIndex = getCurrentPicker(picks, players, TOTAL_ROUNDS);
  const myPicks = picks.filter((p) => p.game_player_id === myPlayerId);

  // Pot gating: rounds 1-2 = pot 1, 3-4 = pot 2, 5-6 = pot 3, 7-8 = pot 4
  const currentRound = players.length > 0 ? Math.floor(picks.length / players.length) + 1 : 1;
  const activePot = Math.min(4, Math.ceil(currentRound / 2));
  const isMyTurn = players[currentPickerIndex]?.id === myPlayerId;
  const draftComplete = picks.length >= players.length * TOTAL_ROUNDS;

  // Taken teams map: teamApiId -> playerName
  // Key by team_api_id (if real) or team_code (fallback)
  const takenTeamsMap = {};
  for (const pick of picks) {
    const player = players.find((p) => p.id === pick.game_player_id);
    const key = pick.team_api_id ?? pick.team_code;
    takenTeamsMap[key] = player?.player_name || 'Taken';
  }
  function teamKey(team) {
    return team.api_id > 0 ? team.api_id : (team.code || team.name.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 6));
  }

  async function handleConfirmPick() {
    if (!selectedTeam || !isMyTurn || submitting) return;
    setSubmitting(true);
    try {
      const pickNumber = picks.length + 1;
      const isRealTeam = selectedTeam.api_id > 0;
      const { error } = await supabase.from('draft_picks').insert({
        game_id: gameId,
        game_player_id: myPlayerId,
        pick_number: pickNumber,
        pot: selectedTeam.pot,
        team_code: selectedTeam.code || selectedTeam.name.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 6),
        team_api_id: isRealTeam ? selectedTeam.api_id : null,
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
      selecting_players: 'tournament',
      selecting_captain: 'tournament',
    };
    const next = transitions[game.status];
    if (!next) return;

    // No blocking check — the host decides when to advance.
    // The host dashboard shows who is/isn't done.

    const { error } = await supabase
      .from('games')
      .update({ status: next })
      .eq('id', gameId);
    if (error) alert('Error: ' + error.message);
  }

  // Auto-pick: 1 player per position max, prefer stars, guarantee at least 1 star
  function handleAutoPick(teamApiId) {
    const squad = teamPlayers[teamApiId] || [];
    const positions = ['GK', 'DEF', 'MID', 'FWD'];
    const picked = [];
    const pickedIds = new Set();
    const pickedPositions = new Set();

    // First: pick 1 star player (highest-rated position order)
    for (const pos of positions) {
      const star = squad.filter(p => normalizePosition(p.position) === pos && p.isTop)[0];
      if (star) { picked.push(star.api_id); pickedIds.add(star.api_id); pickedPositions.add(pos); break; }
    }

    // Fill remaining slots: 1 per position, prefer stars
    for (const pos of positions) {
      if (picked.length >= PICKS_PER_TEAM) break;
      if (pickedPositions.has(pos)) continue;
      const candidates = squad.filter(p => normalizePosition(p.position) === pos && !pickedIds.has(p.api_id));
      const best = candidates.find(p => p.isTop) || candidates[0];
      if (best) { picked.push(best.api_id); pickedIds.add(best.api_id); pickedPositions.add(pos); }
    }
    // If still short (PICKS_PER_TEAM > 4), fill from any position
    if (picked.length < PICKS_PER_TEAM) {
      const remaining = squad.filter(p => !pickedIds.has(p.api_id)).sort((a, b) => (b.isTop ? 1 : 0) - (a.isTop ? 1 : 0));
      for (const p of remaining) {
        if (picked.length >= PICKS_PER_TEAM) break;
        picked.push(p.api_id);
        pickedIds.add(p.api_id);
      }
    }

    const next = { ...selectedPlayerIds, [teamApiId]: picked };
    setSelectedPlayerIds(next);
    // Auto-save when all picks chosen
    if (picked.length === PICKS_PER_TEAM) {
      const draftPick = picks.find((p) => p.game_player_id === myPlayerId && (String(p.team_api_id) === String(teamApiId) || p.team_code === String(teamApiId)));
      if (draftPick) _savePicksForTeam(teamApiId, picked, draftPick);
    }
  }

  // Toggle player selection — one per position (GK / DEF / MID / FWD)
  function togglePlayerPick(teamApiId, playerApiId) {
    const squad = teamPlayers[teamApiId] || [];
    const player = squad.find(p => p.api_id === playerApiId);
    const playerPos = normalizePosition(player?.position);

    setSelectedPlayerIds((prev) => {
      const current = prev[teamApiId] || [];
      // Deselect if already selected
      if (current.includes(playerApiId)) {
        return { ...prev, [teamApiId]: current.filter(id => id !== playerApiId) };
      }
      // Replace the existing pick for this position if one exists
      const samePosPick = current.find(id => {
        const p = squad.find(s => s.api_id === id);
        return normalizePosition(p?.position) === playerPos;
      });
      if (samePosPick) {
        return { ...prev, [teamApiId]: current.map(id => id === samePosPick ? playerApiId : id) };
      }
      // Don't exceed max total
      if (current.length >= PICKS_PER_TEAM) return prev;
      const updated = [...current, playerApiId];
      // Auto-save when all players selected
      if (updated.length === PICKS_PER_TEAM) {
        const draftPick = picks.find((p) => p.game_player_id === myPlayerId && (String(p.team_api_id) === String(teamApiId) || p.team_code === String(teamApiId)));
        if (draftPick) setTimeout(() => _savePicksForTeam(teamApiId, updated, draftPick), 0);
      }
      return { ...prev, [teamApiId]: updated };
    });
  }

  async function _savePicksForTeam(teamApiId, playerIds, draftPick) {
    await supabase.from('player_picks').delete()
      .eq('game_id', gameId).eq('game_player_id', myPlayerId).eq('draft_pick_id', draftPick.id);
    const squad = teamPlayers[teamApiId] || [];
    const inserts = playerIds.map((pid) => {
      const player = squad.find(p => p.api_id === pid || String(p.api_id) === String(pid));
      return {
        game_id: gameId,
        game_player_id: myPlayerId,
        draft_pick_id: draftPick.id,
        player_api_id: Number(pid),
        position: normalizePosition(player?.position) || 'MID',
      };
    });
    const { error } = await supabase.from('player_picks').insert(inserts);
    if (error) { alert(`Save failed: ${error.message}`); return false; }
    setSavedPlayerPicks((prev) => {
      const filtered = prev.filter((p) => p.draft_pick_id !== draftPick.id);
      return [...filtered, ...inserts.map((i, idx) => ({ ...i, id: `temp-${idx}` }))];
    });
    setDashRefresh(n => n + 1);
    return true;
  }

  async function handleSavePlayerPicks(teamApiId) {
    const playerIds = selectedPlayerIds[teamApiId] || [];
    if (playerIds.length === 0) return;
    const draftPick = picks.find((p) => p.game_player_id === myPlayerId && (String(p.team_api_id) === String(teamApiId) || p.team_code === String(teamApiId)));
    if (!draftPick) { alert('Draft pick not found for this team'); return; }
    const ok = await _savePicksForTeam(teamApiId, playerIds, draftPick);
    if (!ok) alert('Failed to save picks for this team.');
  }

  async function handleLockInSquad() {
    const myTeamIds = myTeams.map(t => t.api_id);
    let allOk = true;
    for (const teamApiId of myTeamIds) {
      const playerIds = selectedPlayerIds[teamApiId] || [];
      if (playerIds.length !== PICKS_PER_TEAM) { allOk = false; continue; }
      const draftPick = picks.find((p) => p.game_player_id === myPlayerId && (String(p.team_api_id) === String(teamApiId) || p.team_code === String(teamApiId)));
      if (!draftPick) { allOk = false; continue; }
      await _savePicksForTeam(teamApiId, playerIds, draftPick);
    }
    if (!allOk) alert('Some teams are missing picks — make sure each team has exactly 3 players selected.');
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
  const myTeams = myPicks.map((pick) => {
    if (pick.team_api_id) return teams.find((t) => t.api_id === pick.team_api_id);
    return teams.find((t) => (t.code || t.name.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 6)) === pick.team_code);
  }).filter(Boolean);

  // My picked players for captain selection
  const myPickedPlayerApiIds = savedPlayerPicks.map((p) => p.player_api_id);

  // Contextual mascot hint
  const waitingPlayer = players[currentPickerIndex]?.player_name;
  const mascotHint = (() => {
    if (game?.status === 'drafting_teams') {
      if (draftComplete) return { pose: 'celebrating', message: "All teams drafted! Host will move everyone to the player selection phase next." };
      if (isMyTurn) return { pose: 'excited', message: `Pot ${activePot} is open — pick a team! Pots 1 & 2 are the strongest nations. Tapped a card? Hit Confirm Pick to lock it in.` };
      return { pose: 'idle', message: `${waitingPlayer || 'Someone'} is picking right now. Sit tight — you'll get your turn in snake order.` };
    }
    if (game?.status === 'selecting_players') {
      const draftPick = activeTeamTab ? picks.find(p => p.game_player_id === myPlayerId && (p.team_api_id === activeTeamTab || p.team_api_id === String(activeTeamTab))) : null;
      const savedCount = draftPick ? savedPlayerPicks.filter(p => p.draft_pick_id === draftPick.id).length : 0;
      if (!activeTeamTab) return { pose: 'idle', message: `Tap a team tab above to see its squad. You need to pick ${PICKS_PER_TEAM} players from each of your ${TOTAL_ROUNDS} teams.` };
      if (savedCount === PICKS_PER_TEAM) return { pose: 'celebrating', message: "Nice picks! Tap another team tab to keep going. Come back anytime to change your selections before the host moves on." };
      return { pose: 'thinking', message: `Pick ${PICKS_PER_TEAM} players — max one per position (GK / DEF / MID / FWD). Stars ⭐ highlight each team's standout players.` };
    }
    if (game?.status === 'selecting_captain') {
      if (captainSaved) return { pose: 'celebrating', message: "Captain locked in! They'll earn double points all tournament. Sit tight for the host to kick things off." };
      return { pose: 'thinking', message: "Pick one player to be your captain — they score double points for every goal, assist, and clean sheet. Choose your best player!" };
    }
    return null;
  })();

  if (gameLoading || playersLoading || teamsLoading) {
    return (
      <div className="loading">
        <Mascot pose="thinking" size={90} />
        <div style={{ marginTop: 12, color: 'var(--text-muted)' }}>Loading draft...</div>
      </div>
    );
  }

  return (
    <div className="page" style={{ paddingBottom: 100 }}>
      {showPoke && <PokeToast message={pokeMessage} onDismiss={dismissPoke} />}

      {/* Phase header */}
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--gold)' }}>
          {game?.status === 'drafting_teams' && '🏳️ Team Draft'}
          {(game?.status === 'selecting_players' || game?.status === 'selecting_captain') && (
            savedPlayerPicks.length >= TOTAL_ROUNDS * PICKS_PER_TEAM ? '👑 Choose Your Captain' : '👥 Pick Your Players'
          )}
        </h1>
      </div>

      {/* Mascot hint */}
      {mascotHint && (
        <MascotHint
          message={mascotHint.message}
          pose={mascotHint.pose}
          style={{ marginBottom: 20 }}
        />
      )}

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
              if (pot !== activePot) return null;
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
                      const taken = !!takenTeamsMap[teamKey(team)];
                      const takenBy = takenTeamsMap[teamKey(team)];
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
                      const taken = !!takenTeamsMap[teamKey(team)];
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

      {/* PHASE: selecting_players (or legacy selecting_captain) — each player flows independently */}
      {(game?.status === 'selecting_players' || game?.status === 'selecting_captain') && (
        <>
          {isHost && (
            <HostSetupDashboard
              players={players}
              gameId={gameId}
              totalPicks={TOTAL_ROUNDS * PICKS_PER_TEAM}
              onStart={handleAdvancePhase}
              refreshKey={dashRefresh}
            />
          )}

          {/* Progress + Lock In bar */}
          {savedPlayerPicks.length < TOTAL_ROUNDS * PICKS_PER_TEAM && (() => {
            const savedTeams = myTeams.filter(t => {
              const dp = picks.find(p => p.game_player_id === myPlayerId && String(p.team_api_id) === String(t.api_id));
              return dp && savedPlayerPicks.filter(pp => pp.draft_pick_id === dp.id).length === PICKS_PER_TEAM;
            });
            const selectedTeams = myTeams.filter(t => (selectedPlayerIds[t.api_id] || []).length === PICKS_PER_TEAM);
            const allSelected = selectedTeams.length === TOTAL_ROUNDS;
            return (
              <div className="card mb-16" style={{ padding: '12px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {savedTeams.length}/{TOTAL_ROUNDS} teams locked in
                  </span>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={handleLockInSquad}
                    disabled={!allSelected}
                    style={{ opacity: allSelected ? 1 : 0.5 }}
                  >
                    🔒 Lock In Squad
                  </button>
                </div>
                <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(savedTeams.length / TOTAL_ROUNDS) * 100}%`, background: 'var(--success)', borderRadius: 3, transition: 'width 0.3s' }} />
                </div>
              </div>
            );
          })()}

          {/* Show captain UI once all player picks are saved */}
          {savedPlayerPicks.length >= TOTAL_ROUNDS * PICKS_PER_TEAM ? (
            <div className="card">
              <p style={{ fontWeight: 700, marginBottom: 12, textAlign: 'center' }}>
                👑 Pick Your Captain
              </p>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 16, textAlign: 'center' }}>
                Pick one player to be your captain — they score double points for every goal, assist, and clean sheet.
              </p>
              <CaptainGrid
                playerPicks={captainPlayers}
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
                  {captainSaved ? '✅ Captain Saved — waiting for host to start' : '👑 Confirm Captain'}
                </button>
              </div>
            </div>
          ) : (
            <>

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
                  style={savedCount === PICKS_PER_TEAM ? {
                    borderColor: 'var(--success)',
                    color: activeTeamTab === team.api_id ? undefined : 'var(--success)',
                    background: activeTeamTab === team.api_id ? undefined : 'rgba(34,197,94,0.08)',
                  } : {}}
                >
                  {savedCount === PICKS_PER_TEAM ? '✓ ' : ''}{team.name}
                  {savedCount > 0 && savedCount < PICKS_PER_TEAM && (
                    <span
                      className="badge badge-muted"
                      style={{ marginLeft: 6, fontSize: '0.65rem' }}
                    >
                      {savedCount}/{PICKS_PER_TEAM}
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
                      {(() => {
                        const sel = selectedPlayerIds[activeTeamTab] || [];
                        const squad = teamPlayers[activeTeamTab] || [];
                        const posPicked = sel.map(id => normalizePosition(squad.find(p => p.api_id === id)?.position)).filter(Boolean);
                        return `${sel.length}/3${posPicked.length ? ' — ' + posPicked.join(', ') : ''}`;
                      })()}
                    </span>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      {(() => {
                        const dp = picks.find(p => p.game_player_id === myPlayerId && String(p.team_api_id) === String(activeTeamTab));
                        const saved = dp && savedPlayerPicks.filter(pp => pp.draft_pick_id === dp.id).length === PICKS_PER_TEAM;
                        return saved ? <span style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 700 }}>✓ Saved</span> : null;
                      })()}
                      <button
                        className="btn btn-sm"
                        style={{ color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                        onClick={() => handleAutoPick(activeTeamTab)}
                      >
                        ⚡ Auto Pick
                      </button>
                    </div>
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
        </>
      )}
    </div>
  );
}
