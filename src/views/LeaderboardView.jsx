import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useScores } from '../hooks/useScores.js';
import { usePlayers } from '../hooks/usePlayers.js';
import { useDraft } from '../hooks/useDraft.js';
import { getSession } from '../lib/session.js';
import { supabase } from '../lib/supabase.js';
import { RESULT_TYPES, SCORING, normalizePosition } from '../lib/constants.js';
import LeaderboardRow from '../components/LeaderboardRow.jsx';
import SubstitutionModal from '../components/SubstitutionModal.jsx';
import { getSquadForTeam } from '../lib/wcSquads.js';

const POS_COLOR = { GK: 'var(--gold)', DEF: 'var(--success)', MID: '#3b82f6', FWD: 'var(--danger)' };

function playerPointsFromBreakdown(breakdown, playerId) {
  let pts = 0;
  const id = String(playerId);
  for (const [key, val] of Object.entries(breakdown || {})) {
    if (key.includes(`_${id}_`) || key.startsWith(`cs_${id}_`) || key.startsWith(`golden_boot_${id}`)) {
      pts += val;
    }
  }
  return pts;
}

function buildMascotMessage({ myRank, totalPlayers, myTeamIds, teams, liveFixtures, lastFtFixture, nextFixture, playerName }) {
  const msgs = [];
  const name = playerName ? playerName.split(' ')[0] : 'champ';

  // Position — with personality
  if (myRank && totalPlayers) {
    if (myRank === 1) {
      const taunts = [
        `${name} is running this thing. The others might as well be picking teams blindfolded. 👑`,
        `1st place. Honestly surprised anyone else even showed up. 👑`,
        `Top of the table, baby. Your opponents are busy Googling "how to get better at Copa Fantasy." 👑`,
      ];
      msgs.push(taunts[Math.floor(Date.now() / 60000) % taunts.length]);
    } else if (myRank === 2) {
      msgs.push(`2nd place. So close to glory you can almost taste it — but so far it just tastes like someone else's victory. 😤`);
    } else if (myRank === 3) {
      msgs.push(`3rd. Podium finish, technically. Bronze is still a medal... they give those out at the Olympics for a reason. 🥉`);
    } else if (myRank === totalPlayers) {
      const roasts = [
        `Dead last. ${name}, we need to talk about your life choices. 💀`,
        `Last place. At this point your teams are more of a charity donation to the group. 💀`,
        `Bottom of the table. Your picks are so bad they should come with a warning label. 💀`,
      ];
      msgs.push(roasts[Math.floor(Date.now() / 60000) % roasts.length]);
    } else {
      msgs.push(`#${myRank} of ${totalPlayers}. Perfectly mediocre — like a 0-0 draw that somehow took 90 minutes. Keep grinding. 😅`);
    }
  }

  // Live game — excited commentary
  if (liveFixtures.length > 0) {
    for (const fix of liveFixtures) {
      const homeTeam = teams.find(t => String(t.api_id) === String(fix.home_team_api_id));
      const awayTeam = teams.find(t => String(t.api_id) === String(fix.away_team_api_id));
      const myTeamIsHome = myTeamIds.includes(String(fix.home_team_api_id));
      const myTeamIsAway = myTeamIds.includes(String(fix.away_team_api_id));
      if (myTeamIsHome || myTeamIsAway) {
        const myTeam = myTeamIsHome ? homeTeam : awayTeam;
        const oppTeam = myTeamIsHome ? awayTeam : homeTeam;
        const myGoals = myTeamIsHome ? (fix.home_goals ?? 0) : (fix.away_goals ?? 0);
        const oppGoals = myTeamIsHome ? (fix.away_goals ?? 0) : (fix.home_goals ?? 0);
        if (myGoals > oppGoals) {
          msgs.push(`🔴 LIVE: ${myTeam?.name} ${myGoals}–${oppGoals} ${oppTeam?.name} (${fix.elapsed}'). They're WINNING. Try to act casual. 🤌`);
        } else if (myGoals < oppGoals) {
          msgs.push(`🔴 LIVE: ${myTeam?.name} ${myGoals}–${oppGoals} ${oppTeam?.name} (${fix.elapsed}'). Losing. It's fine. It's fine. EVERYTHING IS FINE. 😰`);
        } else {
          msgs.push(`🔴 LIVE: ${myTeam?.name} ${myGoals}–${oppGoals} ${oppTeam?.name} (${fix.elapsed}'). A draw so far — the football equivalent of a shrug emoji. 🤷`);
        }
      }
    }
  }

  // Last result — snarky recap
  if (lastFtFixture) {
    const homeTeam = teams.find(t => String(t.api_id) === String(lastFtFixture.home_team_api_id));
    const awayTeam = teams.find(t => String(t.api_id) === String(lastFtFixture.away_team_api_id));
    const myTeamIsHome = myTeamIds.includes(String(lastFtFixture.home_team_api_id));
    const myTeam = myTeamIsHome ? homeTeam : awayTeam;
    const opp = myTeamIsHome ? awayTeam : homeTeam;
    const myGoals = myTeamIsHome ? lastFtFixture.home_goals : lastFtFixture.away_goals;
    const oppGoals = myTeamIsHome ? lastFtFixture.away_goals : lastFtFixture.home_goals;
    if (myGoals > oppGoals) {
      const wins = [
        `${myTeam?.name} put ${opp?.name} to the sword ${myGoals}–${oppGoals}. Chef's kiss. 💋`,
        `${myTeam?.name} beat ${opp?.name} ${myGoals}–${oppGoals}. ${opp?.name} is going home to cry. ✅`,
        `${myGoals}–${oppGoals} over ${opp?.name}. ${myTeam?.name} said "not today." 💪`,
      ];
      msgs.push(wins[Math.floor((myGoals + oppGoals) % wins.length)]);
    } else if (myGoals === oppGoals) {
      msgs.push(`${myTeam?.name} drew ${myGoals}–${oppGoals} with ${opp?.name}. A point shared is a point… that helps nobody in fantasy. 🤝`);
    } else {
      const losses = [
        `${myTeam?.name} lost ${myGoals}–${oppGoals} to ${opp?.name}. That one hurt. Moment of silence. 😶`,
        `${opp?.name} dismantled ${myTeam?.name} ${oppGoals}–${myGoals}. Not great, ${name}. Not great. ❌`,
        `${myTeam?.name} lost ${myGoals}–${oppGoals}. At least the players looked great doing it. Probably. ❌`,
      ];
      msgs.push(losses[Math.floor((myGoals + oppGoals) % losses.length)]);
    }
  }

  // Next game — hype or dread
  if (nextFixture) {
    const homeTeam = teams.find(t => String(t.api_id) === String(nextFixture.home_team_api_id));
    const awayTeam = teams.find(t => String(t.api_id) === String(nextFixture.away_team_api_id));
    const myTeamIsHome = myTeamIds.includes(String(nextFixture.home_team_api_id));
    const myTeam = myTeamIsHome ? homeTeam : awayTeam;
    const opp = myTeamIsHome ? awayTeam : homeTeam;
    const dateStr = nextFixture.date
      ? new Date(nextFixture.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
      : 'soon';
    const previews = [
      `📅 ${myTeam?.name} vs ${opp?.name} on ${dateStr}. Pray to whatever football gods you believe in.`,
      `📅 Up next: ${myTeam?.name} face ${opp?.name} on ${dateStr}. Time to get nervous again.`,
      `📅 ${opp?.name} visit on ${dateStr}. ${myTeam?.name} better show up.`,
    ];
    msgs.push(previews[Math.floor(Date.now() / 3600000) % previews.length]);
  }

  if (msgs.length === 0) {
    const idle = [
      `Scores are coming. Until then, enjoy the false sense of security. ⚽`,
      `Nothing to report yet. Your teams are warming up. Or so we hope. ⚽`,
      `All quiet on the Copa front. The chaos is coming, ${name}. Brace yourself. ⚽`,
    ];
    return idle[Math.floor(Date.now() / 60000) % idle.length];
  }

  return msgs.join(' ');
}

export default function LeaderboardView() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const { scores, loading: scoresLoading } = useScores(gameId);
  const { players } = usePlayers(gameId);
  const { picks } = useDraft(gameId);
  const session = getSession();
  const isHost = Boolean(session?.hostToken);
  const [linkedGameId, setLinkedGameId] = useState(null);

  useEffect(() => {
    supabase.from('games').select('linked_game_id').eq('id', gameId).single()
      .then(({ data }) => { if (data?.linked_game_id) setLinkedGameId(data.linked_game_id); });
  }, [gameId]);

  const [teams, setTeams] = useState([]);
  const [fixtures, setFixtures] = useState([]);
  const [allPlayers, setAllPlayers] = useState([]);
  const [playerPicksAll, setPlayerPicksAll] = useState([]);
  const [captainPicksAll, setCaptainPicksAll] = useState([]);
  const [expandedRow, setExpandedRow] = useState(null);

  // Substitutions
  const [mySubModal, setMySubModal] = useState(null); // { draftPick, team, currentPlayers }
  const [mySubstitutions, setMySubstitutions] = useState([]); // rows from DB
  const [myPlayerPicks, setMyPlayerPicks] = useState([]);
  const [squadPlayers, setSquadPlayers] = useState({}); // teamApiId -> player objects

  // Live / upcoming fixtures
  const [liveFixtures, setLiveFixtures] = useState([]);
  const [upcomingFixtures, setUpcomingFixtures] = useState([]);
  const [liveEvents, setLiveEvents] = useState([]);

  // Host controls
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [selectedResultType, setSelectedResultType] = useState('group_win');
  const [bonusPlayerId, setBonusPlayerId] = useState('');
  const [bonusPoints, setBonusPoints] = useState('');
  const [bonusDesc, setBonusDesc] = useState('');
  const [hostLoading, setHostLoading] = useState(false);
  const [hostMsg, setHostMsg] = useState('');

  useEffect(() => {
    async function loadData() {
      const myId = session?.playerId;
      const [
        { data: teamsData },
        { data: fixturesData },
        { data: ppData },
        { data: cpData },
        { data: subsData },
        { data: myPpData },
        { data: liveData },
        { data: upcomingData },
      ] = await Promise.all([
        supabase.from('teams').select('*'),
        supabase.from('fixtures').select('api_id, home_team_api_id, away_team_api_id, home_goals, away_goals, round').eq('status_short', 'FT'),
        supabase.from('player_picks').select('*').eq('game_id', gameId),
        supabase.from('captain_picks').select('*').eq('game_id', gameId),
        supabase.from('substitutions').select('*').eq('game_id', gameId).eq('game_player_id', myId || ''),
        supabase.from('player_picks').select('*').eq('game_id', gameId).eq('game_player_id', myId || ''),
        supabase.from('fixtures')
          .select('api_id, home_team_api_id, away_team_api_id, home_goals, away_goals, elapsed, status_short, date')
          .neq('status_short', 'FT')
          .not('elapsed', 'is', null),
        supabase.from('fixtures')
          .select('api_id, home_team_api_id, away_team_api_id, date, status_short')
          .eq('status_short', 'NS')
          .order('date', { ascending: true }),
      ]);

      setTeams(teamsData || []);
      setFixtures(fixturesData || []);
      setPlayerPicksAll(ppData || []);
      setCaptainPicksAll(cpData || []);
      setMySubstitutions(subsData || []);
      setMyPlayerPicks(myPpData || []);
      setLiveFixtures(liveData || []);
      setUpcomingFixtures(upcomingData || []);

      // Fetch match events for live fixtures
      const liveIds = (liveData || []).map(f => f.api_id);
      if (liveIds.length > 0) {
        const { data: eventsData } = await supabase
          .from('match_events')
          .select('fixture_api_id, player_api_id, type')
          .in('fixture_api_id', liveIds);
        setLiveEvents(eventsData || []);
      }

      // Only fetch players that are actually picked in this game
      const pickedIds = [...new Set((ppData || []).map(p => p.player_api_id).filter(Boolean))];
      if (pickedIds.length > 0) {
        const { data: playersData } = await supabase.from('players').select('*').in('api_id', pickedIds);
        setAllPlayers(playersData || []);
      }
    }
    loadData();
  }, [gameId]);

  async function handleAddTeamResult() {
    if (!selectedTeamId || hostLoading) return;
    setHostLoading(true);
    setHostMsg('');
    try {
      const pts = SCORING[selectedResultType] || 0;
      // Find all game_players who have this team
      const gamePickers = picks
        .filter(p => p.team_api_id === selectedTeamId)
        .map(p => p.game_player_id);

      for (const gpId of gamePickers) {
        // Get or create user_scores row
        const { data: existing } = await supabase
          .from('user_scores')
          .select('*')
          .eq('game_id', gameId)
          .eq('game_player_id', gpId)
          .single();

        const currentBreakdown = existing?.breakdown || {};
        const teamKey = `team_${selectedTeamId}_${selectedResultType}`;
        const newBreakdown = { ...currentBreakdown, [teamKey]: (currentBreakdown[teamKey] || 0) + pts };
        const newTotal = Object.values(newBreakdown).reduce((a, b) => a + b, 0);

        await supabase.from('user_scores').upsert({
          game_id: gameId,
          game_player_id: gpId,
          total_points: newTotal,
          breakdown: newBreakdown,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'game_id,game_player_id' });
      }
      setHostMsg(`Added ${pts} pts to ${gamePickers.length} player(s) for ${selectedResultType}`);
    } catch (err) {
      setHostMsg(`Error: ${err.message}`);
    } finally {
      setHostLoading(false);
    }
  }

  async function handleAddBonus() {
    if (!bonusPlayerId || !bonusPoints || hostLoading) return;
    setHostLoading(true);
    setHostMsg('');
    try {
      const pts = Number(bonusPoints);
      const { data: existing } = await supabase
        .from('user_scores')
        .select('*')
        .eq('game_id', gameId)
        .eq('game_player_id', bonusPlayerId)
        .single();

      const currentBreakdown = existing?.breakdown || {};
      const bonusKey = `bonus_${Date.now()}`;
      const newBreakdown = { ...currentBreakdown, [bonusKey]: pts };
      if (bonusDesc) newBreakdown[`bonus_desc_${Date.now()}`] = bonusDesc;
      const newTotal = Object.values(newBreakdown).filter(v => typeof v === 'number').reduce((a, b) => a + b, 0);

      await supabase.from('user_scores').upsert({
        game_id: gameId,
        game_player_id: bonusPlayerId,
        total_points: newTotal,
        breakdown: newBreakdown,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'game_id,game_player_id' });

      setHostMsg(`Added ${pts} bonus points`);
      setBonusPoints('');
      setBonusDesc('');
    } catch (err) {
      setHostMsg(`Error: ${err.message}`);
    } finally {
      setHostLoading(false);
    }
  }

  async function handleRecalculate() {
    setHostLoading(true);
    setHostMsg('Syncing match events...');
    const HEADERS = { 'Content-Type': 'application/json', 'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhtYXNhYXB3Ymh4dWV1aHh4cWtkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4MTI1OTgsImV4cCI6MjA5NjM4ODU5OH0.pAdFowezL_l7QLLA0Y4KgyGAcDbYtx0OppA_id1agdY' };
    const BASE = 'https://hmasaapwbhxueuhxxqkd.supabase.co/functions/v1';
    try {
      // Step 1: sync latest match events from ESPN
      await fetch(`${BASE}/sync-match-events`, { method: 'POST', headers: HEADERS, body: '{}' });
      setHostMsg('Calculating scores...');
      // Step 2: calculate scores
      const res = await fetch(`${BASE}/calculate-scores`, {
        method: 'POST', headers: HEADERS,
        body: JSON.stringify({ game_id: gameId }),
      });
      const data = await res.json();
      if (data.success) {
        setHostMsg(`✓ Done — ${data.fixtures_processed} fixtures, ${data.events_processed} events, ${data.players_updated} players updated`);
      } else {
        setHostMsg(`Error: ${data.error}`);
      }
    } catch (err) {
      setHostMsg(`Error: ${err.message}`);
    } finally {
      setHostLoading(false);
    }
  }

  async function handleOverride(gpId, newTotal) {
    setHostLoading(true);
    try {
      await supabase.from('user_scores').upsert({
        game_id: gameId,
        game_player_id: gpId,
        total_points: newTotal,
        breakdown: { override: newTotal },
        updated_at: new Date().toISOString(),
      }, { onConflict: 'game_id,game_player_id' });
      setHostMsg(`Override applied: ${newTotal} pts`);
    } catch (err) {
      setHostMsg(`Error: ${err.message}`);
    } finally {
      setHostLoading(false);
    }
  }

  // Build leaderboard entries: merge players with scores
  const leaderboardEntries = players.map(player => {
    const score = scores.find(s => s.game_player_id === player.id);
    return { player, score };
  }).sort((a, b) => (b.score?.total_points || 0) - (a.score?.total_points || 0));

  const captainMap = {};
  for (const cp of captainPicksAll) {
    captainMap[cp.game_player_id] = cp.player_api_id;
  }

  // My teams with player picks (accounting for subs)
  const myId = session?.playerId;
  const myDraftPicks = picks.filter(p => p.game_player_id === myId);
  const myScore = scores.find(s => s.game_player_id === myId);
  const myRank = myId ? leaderboardEntries.findIndex(e => e.player.id === myId) + 1 : null;
  const totalPlayers = leaderboardEntries.length;

  // My team api ids for mascot
  const myTeamIds = myDraftPicks.map(dp => String(dp.team_api_id));

  // Last FT fixture involving my teams
  const ftFixtures = fixtures; // already FT
  const lastFtFixture = useMemo(() => {
    if (!myTeamIds.length) return null;
    const relevant = ftFixtures.filter(f =>
      myTeamIds.includes(String(f.home_team_api_id)) || myTeamIds.includes(String(f.away_team_api_id))
    );
    return relevant.length > 0 ? relevant[relevant.length - 1] : null;
  }, [ftFixtures, myTeamIds]);

  // Next upcoming fixture involving my teams
  const nextFixture = useMemo(() => {
    if (!myTeamIds.length) return null;
    return upcomingFixtures.find(f =>
      myTeamIds.includes(String(f.home_team_api_id)) || myTeamIds.includes(String(f.away_team_api_id))
    ) || null;
  }, [upcomingFixtures, myTeamIds]);

  const mascotMessage = useMemo(() => buildMascotMessage({
    myRank: myRank || null,
    totalPlayers,
    myTeamIds,
    teams,
    liveFixtures,
    lastFtFixture,
    nextFixture,
    playerName: players.find(p => p.id === myId)?.player_name || '',
  }), [myRank, totalPlayers, myTeamIds, teams, liveFixtures, lastFtFixture, nextFixture, players, myId]);

  function getActivePlayers(draftPickId, teamApiId) {
    const base = myPlayerPicks.filter(p => p.draft_pick_id === draftPickId);
    const sub = mySubstitutions.find(s => s.draft_pick_id === draftPickId);
    if (!sub) return base;
    return base.map(p => p.player_api_id === sub.old_player_api_id
      ? { ...p, player_api_id: sub.new_player_api_id, subbed: true }
      : p
    );
  }

  function resolvePlayerObj(apiId) {
    return allPlayers.find(p => String(p.api_id) === String(apiId)) || null;
  }

  function resolvePlayerName(apiId, teamApiId) {
    const dbPlayer = allPlayers.find(p => String(p.api_id) === String(apiId));
    if (dbPlayer) return dbPlayer.name;
    const squad = squadPlayers[teamApiId] || [];
    const local = squad.find(p => String(p.api_id) === String(apiId));
    return local?.name || `#${apiId}`;
  }

  function resolvePlayerPos(apiId, teamApiId) {
    const dbPlayer = allPlayers.find(p => String(p.api_id) === String(apiId));
    if (dbPlayer) return normalizePosition(dbPlayer.position);
    const squad = squadPlayers[teamApiId] || [];
    const local = squad.find(p => String(p.api_id) === String(apiId));
    return local ? normalizePosition(local.position) : '?';
  }

  return (
    <div className="page">
      {/* 1. Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <h1 className="page-title" style={{ margin: 0 }}>Leaderboard</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          {isHost && linkedGameId && (
            <button
              className="btn btn-sm"
              style={{ background: 'rgba(59,130,246,0.1)', color: 'var(--info)', border: '1px solid rgba(59,130,246,0.3)' }}
              onClick={() => navigate(`/leaderboard/${linkedGameId}`)}
            >
              👁 Group B →
            </button>
          )}
          {linkedGameId && (
            <button
              className="btn btn-sm"
              style={{ background: 'rgba(255,215,0,0.1)', color: 'var(--gold)', border: '1px solid rgba(255,215,0,0.3)' }}
              onClick={() => navigate(`/combined/${gameId}`)}
            >
              📊 Combined
            </button>
          )}
        </div>
      </div>

      {/* 2. Mascot Assistant */}
      {myId && (
        <div className="card mb-16" style={{ display: 'flex', gap: 12, alignItems: 'flex-start', background: 'rgba(255,215,0,0.04)', border: '1px solid rgba(255,215,0,0.2)' }}>
          <div style={{ fontSize: '2.2rem', flexShrink: 0 }}>⚽</div>
          <p style={{ fontSize: '0.88rem', lineHeight: 1.6, color: 'var(--text)', margin: 0 }}>{mascotMessage}</p>
        </div>
      )}

      {/* 3. Leaderboard rankings */}
      {scoresLoading ? (
        <div className="loading"><div className="spinner" /></div>
      ) : leaderboardEntries.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon">🏆</div>
          <div className="empty-state__text">No scores yet</div>
        </div>
      ) : (
        <div style={{ marginBottom: 24 }}>
          {leaderboardEntries.map(({ player, score }, i) => (
            <LeaderboardRow
              key={player.id}
              rank={i + 1}
              player={player}
              score={score}
              picks={picks}
              playerPicks={playerPicksAll}
              captainPickId={captainMap[player.id]}
              teams={teams}
              fixtures={fixtures}
              players={allPlayers}
              isExpanded={expandedRow === player.id}
              onToggle={() => setExpandedRow(expandedRow === player.id ? null : player.id)}
              isHost={isHost}
              onOverride={isHost ? handleOverride : null}
            />
          ))}
        </div>
      )}

      {/* 4. My Squad — player card grid */}
      {myId && myDraftPicks.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div className="section-header">My Squad</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {myDraftPicks.map(dp => {
              const team = teams.find(t => String(t.api_id) === String(dp.team_api_id));
              const activePlayers = getActivePlayers(dp.id, dp.team_api_id);
              const subUsed = mySubstitutions.some(s => s.draft_pick_id === dp.id);
              const isLive = liveFixtures.some(f =>
                String(f.home_team_api_id) === String(dp.team_api_id) ||
                String(f.away_team_api_id) === String(dp.team_api_id)
              );
              return (
                <div key={dp.id} className="card" style={{ padding: '12px 14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{team?.name || dp.team_code}</span>
                      {isLive && (
                        <span style={{
                          fontSize: '0.7rem', fontWeight: 700, color: 'var(--danger)',
                          background: 'rgba(239,68,68,0.12)', padding: '2px 7px', borderRadius: 100,
                          animation: 'pulse 1.5s ease-in-out infinite',
                        }}>
                          🔴 LIVE
                        </span>
                      )}
                    </div>
                    {subUsed ? (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Sub used ✓</span>
                    ) : (
                      <button
                        className="btn btn-sm"
                        style={{ fontSize: '0.75rem', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
                        onClick={() => setMySubModal({ draftPick: dp, team, currentPlayers: activePlayers })}
                      >
                        🔄 Sub
                      </button>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {activePlayers.map(p => {
                      const pos = resolvePlayerPos(p.player_api_id, dp.team_api_id);
                      const posColor = POS_COLOR[pos] || 'var(--border)';
                      const playerName = resolvePlayerName(p.player_api_id, dp.team_api_id);
                      const player = resolvePlayerObj(p.player_api_id);
                      const playerPts = playerPointsFromBreakdown(myScore?.breakdown, p.player_api_id);
                      return (
                        <div key={p.player_api_id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, width: 72 }}>
                          {/* Photo circle with position-colored border */}
                          <div style={{
                            width: 52, height: 52, borderRadius: '50%',
                            border: `3px solid ${posColor}`,
                            overflow: 'hidden', background: 'var(--dark-bg)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                          }}>
                            {player?.photo_url ? (
                              <img
                                src={player.photo_url?.includes('cdn.sofifa.net')
                                  ? `https://hmasaapwbhxueuhxxqkd.supabase.co/functions/v1/img-proxy?url=${encodeURIComponent(player.photo_url)}`
                                  : player.photo_url}
                                alt={player.name}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                onError={e => { e.target.style.display = 'none'; }}
                              />
                            ) : (
                              <span style={{ fontSize: '1.2rem', color: posColor }}>👤</span>
                            )}
                          </div>
                          {/* Name */}
                          <span style={{
                            fontSize: '0.68rem', fontWeight: 600, textAlign: 'center', lineHeight: 1.2,
                            maxWidth: 72, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            color: p.subbed ? 'var(--success)' : 'var(--text)',
                          }}>
                            {playerName}{p.subbed ? ' ↑' : ''}
                          </span>
                          {/* Position badge */}
                          <span style={{
                            fontSize: '0.6rem', fontWeight: 700, padding: '1px 5px',
                            borderRadius: 100, background: `${posColor}22`, color: posColor,
                          }}>
                            {pos}
                          </span>
                          {/* Points from this player */}
                          {playerPts !== 0 && (
                            <span style={{
                              fontSize: '0.68rem', fontWeight: 700,
                              color: playerPts > 0 ? 'var(--success)' : 'var(--danger)',
                            }}>
                              {playerPts > 0 ? '+' : ''}{playerPts}pts
                            </span>
                          )}
                        </div>
                      );
                    })}
                    {activePlayers.length === 0 && (
                      <span className="text-muted text-sm">No players picked</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {mySubModal && (
        <SubstitutionModal
          gameId={gameId}
          gamePlayerId={myId}
          draftPick={mySubModal.draftPick}
          team={mySubModal.team}
          currentPlayers={mySubModal.currentPlayers}
          onClose={() => setMySubModal(null)}
          onDone={({ draftPickId, oldId, newId }) => {
            setMySubstitutions(prev => [...prev, { draft_pick_id: draftPickId, old_player_api_id: oldId, new_player_api_id: newId }]);
            setMySubModal(null);
          }}
        />
      )}

      {/* 5. Host controls */}
      {isHost && (
        <div className="card mt-24">
          <div className="section-header">Host Controls</div>

          {hostMsg && (
            <div style={{ padding: '10px 14px', background: 'var(--border)', borderRadius: 'var(--radius-sm)', marginBottom: 16, fontSize: '0.85rem', color: 'var(--success)' }}>
              {hostMsg}
            </div>
          )}

          {/* Recalculate from fixtures */}
          <div style={{ marginBottom: 20 }}>
            <button className="btn btn-primary btn-full" onClick={handleRecalculate} disabled={hostLoading}>
              🔄 Recalculate Scores from Fixtures
            </button>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 6 }}>
              Automatically awards points for all completed matches based on each player's drafted teams.
            </p>
          </div>

          {/* Add Team Result */}
          <div style={{ marginBottom: 20 }}>
            <div className="label">Add Team Result</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <select className="select" style={{ flex: 1 }} value={selectedTeamId} onChange={e => setSelectedTeamId(e.target.value)}>
                <option value="">Select team...</option>
                {teams.map(t => (
                  <option key={t.api_id} value={t.api_id}>{t.name}</option>
                ))}
              </select>
              <select className="select" style={{ flex: 1 }} value={selectedResultType} onChange={e => setSelectedResultType(e.target.value)}>
                {RESULT_TYPES.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
              <button className="btn btn-primary" onClick={handleAddTeamResult} disabled={!selectedTeamId || hostLoading}>
                Apply
              </button>
            </div>
          </div>

          {/* Add Player Bonus */}
          <div>
            <div className="label">Add Player Bonus</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
              <select className="select" style={{ flex: 1 }} value={bonusPlayerId} onChange={e => setBonusPlayerId(e.target.value)}>
                <option value="">Select player...</option>
                {players.map(p => (
                  <option key={p.id} value={p.id}>{p.player_name}</option>
                ))}
              </select>
              <input
                type="number"
                className="input"
                style={{ width: 100 }}
                placeholder="Points"
                value={bonusPoints}
                onChange={e => setBonusPoints(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                className="input"
                placeholder="Description (optional)"
                value={bonusDesc}
                onChange={e => setBonusDesc(e.target.value)}
              />
              <button className="btn btn-primary" onClick={handleAddBonus} disabled={!bonusPlayerId || !bonusPoints || hostLoading}>
                Add Bonus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
