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
import MascotHint from '../components/MascotHint.jsx';

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

// ─── Mascot helpers ────────────────────────────────────────────────

function parseBreakdownKey(key, val) {
  let m = key.match(/^fix_(\d+)$/);
  if (m) return { fixtureId: m[1], type: 'result', playerId: null, pts: val };
  m = key.match(/^player_(\d+)_goal_(\d+)$/);
  if (m) return { fixtureId: m[2], type: 'goal', playerId: m[1], pts: val };
  m = key.match(/^cs_(\d+)_(\d+)$/);
  if (m) return { fixtureId: m[2], type: 'cleansheet', playerId: m[1], pts: val };
  m = key.match(/^brace_(\d+)_(\d+)$/);
  if (m) return { fixtureId: m[2], type: 'brace', playerId: m[1], pts: val };
  m = key.match(/^hattrick_(\d+)_(\d+)$/);
  if (m) return { fixtureId: m[2], type: 'hattrick', playerId: m[1], pts: val };
  m = key.match(/^dbl_assist_(\d+)_(\d+)$/);
  if (m) return { fixtureId: m[2], type: 'dbl_assist', playerId: m[1], pts: val };
  m = key.match(/^upset_(\d+)$/);
  if (m) return { fixtureId: m[1], type: 'upset', playerId: null, pts: val };
  return null;
}

function getMyRecentPoints(breakdown, fixtures, teams, allPlayers, maxFixtures = 3) {
  const teamName = (id) => teams.find(t => String(t.api_id) === String(id))?.name || 'Someone';
  const lastName = (id) => {
    const p = allPlayers.find(pl => String(pl.api_id) === String(id));
    if (!p) return null;
    const parts = (p.name || '').split(' ');
    return parts[parts.length - 1] || p.name;
  };

  const byFixture = {};
  for (const [key, val] of Object.entries(breakdown || {})) {
    if (!val) continue;
    const ev = parseBreakdownKey(key, val);
    if (!ev || !ev.fixtureId) continue;
    if (!byFixture[ev.fixtureId]) byFixture[ev.fixtureId] = { events: [], total: 0 };
    byFixture[ev.fixtureId].events.push(ev);
    byFixture[ev.fixtureId].total += val;
  }

  const fixtureOrder = fixtures.map(f => String(f.api_id));
  const scoredIds = Object.keys(byFixture).sort(
    (a, b) => fixtureOrder.indexOf(a) - fixtureOrder.indexOf(b)
  );
  const recentIds = scoredIds.slice(-maxFixtures);

  const summaries = [];
  let totalPts = 0;
  for (const fid of recentIds) {
    const fix = fixtures.find(f => String(f.api_id) === fid);
    if (!fix) continue;
    const grp = byFixture[fid];
    totalPts += grp.total;

    const home = teamName(fix.home_team_api_id);
    const away = teamName(fix.away_team_api_id);
    const score = `${fix.home_goals ?? 0}–${fix.away_goals ?? 0}`;

    const bits = [];
    if (grp.events.some(e => e.type === 'result' || e.type === 'upset'))
      bits.push(`${home} ${score} ${away}`);

    const star = grp.events
      .filter(e => ['hattrick', 'brace', 'goal', 'dbl_assist', 'cleansheet'].includes(e.type))
      .sort((a, b) => b.pts - a.pts)[0];
    if (star) {
      const who = lastName(star.playerId);
      const verb = who ? {
        hattrick: `${who} bagged a hat trick`,
        brace: `${who} grabbed a brace`,
        goal: `${who} scored`,
        dbl_assist: `${who} set up two`,
        cleansheet: `${who} kept it clean`,
      }[star.type] : null;
      if (verb) bits.push(verb);
    }

    if (bits.length) summaries.push({ text: bits.join(' — '), pts: grp.total });
  }

  return { totalPts, summaries };
}

function getMyLiveContext(liveFixtures, myTeamIds, teams) {
  for (const fix of liveFixtures || []) {
    const homeMine = myTeamIds.includes(String(fix.home_team_api_id));
    const awayMine = myTeamIds.includes(String(fix.away_team_api_id));
    if (!homeMine && !awayMine) continue;
    const myTeam = teams.find(t => String(t.api_id) === String(homeMine ? fix.home_team_api_id : fix.away_team_api_id));
    const opp = teams.find(t => String(t.api_id) === String(homeMine ? fix.away_team_api_id : fix.home_team_api_id));
    const myGoals = homeMine ? (fix.home_goals ?? 0) : (fix.away_goals ?? 0);
    const oppGoals = homeMine ? (fix.away_goals ?? 0) : (fix.home_goals ?? 0);
    return { myTeam, opp, myGoals, oppGoals, elapsed: fix.elapsed };
  }
  return null;
}

function formatKickoff(dateStr) {
  if (!dateStr) return 'soon';
  const d = new Date(dateStr);
  if (isNaN(d)) return 'soon';
  const now = new Date();
  const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1);
  const sameDay = d.toDateString() === now.toDateString();
  const isTomorrow = d.toDateString() === tomorrow.toDateString();
  const time = d.toLocaleTimeString('en-US', {
    hour: 'numeric', minute: d.getMinutes() ? '2-digit' : undefined,
    timeZone: 'America/New_York',
  }).toLowerCase().replace(' ', '');
  if (sameDay) {
    const hr = Number(d.toLocaleTimeString('en-US', { hour: 'numeric', hour12: false, timeZone: 'America/New_York' }));
    return `${hr >= 18 ? 'tonight' : 'today'} at ${time} ET`;
  }
  if (isTomorrow) return `tomorrow at ${time} ET`;
  const day = d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'America/New_York' });
  return `${day} at ${time} ET`;
}

function buildMascotMessage({ myRank, totalPlayers, myTeamIds, teams, liveFixtures, upcomingFixtures, fixtures, breakdown, allPlayers, leaderName, leaderGap, playerName }) {
  const name = playerName ? playerName.split(' ')[0] : null;
  const msgs = [];

  const live = getMyLiveContext(liveFixtures, myTeamIds, teams);
  const recent = getMyRecentPoints(breakdown, fixtures, teams, allPlayers);
  const next = (upcomingFixtures || []).find(f =>
    myTeamIds.includes(String(f.home_team_api_id)) || myTeamIds.includes(String(f.away_team_api_id))
  );

  // 1. Live first — most urgent
  if (live) {
    const { myTeam, opp, myGoals, oppGoals, elapsed } = live;
    if (myGoals > oppGoals) {
      msgs.push(`🔴 ${myTeam?.name} up ${myGoals}–${oppGoals} on ${opp?.name} (${elapsed}'). Don't get comfortable — football has a cruel sense of timing.`);
    } else if (myGoals < oppGoals) {
      msgs.push(`🔴 ${myTeam?.name} down ${myGoals}–${oppGoals} to ${opp?.name} (${elapsed}'). There's still time. Not much, but technically some.`);
    } else {
      msgs.push(`🔴 ${myTeam?.name} ${myGoals}–${oppGoals} ${opp?.name} live (${elapsed}'). All to play for, as the cliché goes.`);
    }
  }
  // 2. Recent points — what you just banked
  else if (recent.totalPts > 0 && recent.summaries.length) {
    const detail = recent.summaries.map(s => `${s.text} (+${s.pts}pts)`).join('. ');
    msgs.push(`You banked +${recent.totalPts}pts from the recent round${name ? `, ${name}` : ''}. ${detail}.`);
  }
  // 3. Nothing yet — tease next fixture
  else if (next) {
    const home = teams.find(t => String(t.api_id) === String(next.home_team_api_id));
    const away = teams.find(t => String(t.api_id) === String(next.away_team_api_id));
    const myTeamIsHome = myTeamIds.includes(String(next.home_team_api_id));
    const myTeam = myTeamIsHome ? home : away;
    const opp = myTeamIsHome ? away : home;
    msgs.push(`${myTeam?.name} face ${opp?.name} ${formatKickoff(next.date)} — your fate partly in their hands. Bold of you to trust them.`);
  }

  // 4. Ranking jab (always appended if space)
  if (myRank && totalPlayers) {
    if (myRank === 1) {
      msgs.push(`You're #1 of ${totalPlayers}. The others have been informed and are devastated.`);
    } else if (leaderName && leaderGap > 0) {
      msgs.push(`You're #${myRank} of ${totalPlayers} — ${leaderGap}pts behind ${leaderName.split(' ')[0]}. You need a miracle, or at least a few well-placed red cards.`);
    } else if (myRank === totalPlayers) {
      msgs.push(`Dead last of ${totalPlayers}${name ? `, ${name}` : ''}. Someone has to be — you've embraced the role.`);
    } else {
      msgs.push(`#${myRank} of ${totalPlayers}. Mid-table mediocrity, lovingly maintained.`);
    }
  }

  return msgs.join(' ') || `Nothing to report${name ? `, ${name}` : ''}. Your teams are presumably doing warmups somewhere, unbothered by your anxiety.`;
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

  async function handleRename(gpId, newName) {
    if (!newName?.trim()) return;
    await supabase.from('game_players').update({ player_name: newName.trim() }).eq('id', gpId);
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

  const mascotMessage = useMemo(() => {
    const leader = leaderboardEntries[0];
    const leaderGap = leader && myScore ? Math.max(0, (leader.score?.total_points || 0) - (myScore.total_points || 0)) : 0;
    return buildMascotMessage({
      myRank: myRank || null,
      totalPlayers,
      myTeamIds,
      teams,
      liveFixtures,
      upcomingFixtures,
      fixtures,
      breakdown: myScore?.breakdown || {},
      allPlayers,
      leaderName: leader?.player?.player_name || null,
      leaderGap,
      playerName: players.find(p => p.id === myId)?.player_name || '',
    });
  }, [myRank, totalPlayers, myTeamIds, teams, liveFixtures, upcomingFixtures, fixtures, myScore, allPlayers, leaderboardEntries, players, myId]);

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
        <h1 className="page-title" style={{ margin: 0 }}>Hub</h1>
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

      {/* 2. Live match cards for MY teams */}
      {liveFixtures.filter(f =>
        myTeamIds.includes(String(f.home_team_api_id)) || myTeamIds.includes(String(f.away_team_api_id))
      ).map(fix => {
        const homeTeam = teams.find(t => String(t.api_id) === String(fix.home_team_api_id));
        const awayTeam = teams.find(t => String(t.api_id) === String(fix.away_team_api_id));
        const myTeamIsHome = myTeamIds.includes(String(fix.home_team_api_id));
        const myTeamObj = myTeamIsHome ? homeTeam : awayTeam;

        // My players in this fixture's team
        const myDraftPickForTeam = myDraftPicks.find(dp => String(dp.team_api_id) === String(myTeamIsHome ? fix.home_team_api_id : fix.away_team_api_id));
        const activePlayers = myDraftPickForTeam ? getActivePlayers(myDraftPickForTeam.id, myDraftPickForTeam.team_api_id) : [];

        return (
          <div key={fix.api_id} className="card" style={{ marginBottom: 12, padding: '12px 14px', border: '1px solid rgba(239,68,68,0.35)', background: 'rgba(239,68,68,0.05)' }}>
            {/* Live badge + elapsed */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--danger)', background: 'rgba(239,68,68,0.15)', padding: '2px 8px', borderRadius: 100, animation: 'pulse 1.5s ease-in-out infinite' }}>
                🔴 LIVE
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{fix.elapsed}'</span>
            </div>

            {/* Score line */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{ textAlign: 'right', flex: 1 }}>
                {homeTeam?.logo_url && <img src={homeTeam.logo_url} alt="" style={{ width: 20, height: 20, objectFit: 'contain', marginBottom: 2 }} />}
                <div style={{ fontWeight: myTeamIsHome ? 800 : 500, fontSize: '0.9rem', color: myTeamIsHome ? 'var(--gold)' : 'var(--text)' }}>{homeTeam?.name}</div>
              </div>
              <div style={{ fontWeight: 900, fontSize: '1.6rem', letterSpacing: 2, minWidth: 60, textAlign: 'center' }}>
                {fix.home_goals ?? 0}–{fix.away_goals ?? 0}
              </div>
              <div style={{ textAlign: 'left', flex: 1 }}>
                {awayTeam?.logo_url && <img src={awayTeam.logo_url} alt="" style={{ width: 20, height: 20, objectFit: 'contain', marginBottom: 2 }} />}
                <div style={{ fontWeight: !myTeamIsHome ? 800 : 500, fontSize: '0.9rem', color: !myTeamIsHome ? 'var(--gold)' : 'var(--text)' }}>{awayTeam?.name}</div>
              </div>
            </div>

            {/* My players in this match */}
            {activePlayers.length > 0 && (
              <div>
                <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                  Your players — {myTeamObj?.name}
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {activePlayers.map(p => {
                    const pos = resolvePlayerPos(p.player_api_id, myDraftPickForTeam.team_api_id);
                    const posColor = POS_COLOR[pos] || 'var(--border)';
                    const pName = resolvePlayerName(p.player_api_id, myDraftPickForTeam.team_api_id);
                    const pObj = resolvePlayerObj(p.player_api_id);
                    const pPts = playerPointsFromBreakdown(myScore?.breakdown, p.player_api_id);
                    // Live events for this player
                    const goals = liveEvents.filter(e => String(e.player_api_id) === String(p.player_api_id) && String(e.fixture_api_id) === String(fix.api_id) && e.type === 'goal').length;
                    const assists = liveEvents.filter(e => String(e.player_api_id) === String(p.player_api_id) && String(e.fixture_api_id) === String(fix.api_id) && e.type === 'assist').length;
                    return (
                      <div key={p.player_api_id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, width: 68 }}>
                        <div style={{ width: 48, height: 48, borderRadius: '50%', border: `2px solid ${posColor}`, overflow: 'hidden', background: 'var(--dark-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {pObj?.photo_url ? (
                            <img src={pObj.photo_url?.includes('cdn.sofifa.net') ? `https://hmasaapwbhxueuhxxqkd.supabase.co/functions/v1/img-proxy?url=${encodeURIComponent(pObj.photo_url)}` : pObj.photo_url} alt={pObj.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none'; }} />
                          ) : <span style={{ fontSize: '1rem', color: posColor }}>👤</span>}
                        </div>
                        <span style={{ fontSize: '0.65rem', fontWeight: 600, textAlign: 'center', maxWidth: 68, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pName}</span>
                        <span style={{ fontSize: '0.58rem', fontWeight: 700, padding: '1px 4px', borderRadius: 100, background: `${posColor}22`, color: posColor }}>{pos}</span>
                        <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
                          {goals > 0 && <span style={{ fontSize: '0.65rem' }}>⚽×{goals}</span>}
                          {assists > 0 && <span style={{ fontSize: '0.65rem' }}>🎯×{assists}</span>}
                          {pPts !== 0 && <span style={{ fontSize: '0.68rem', fontWeight: 700, color: pPts > 0 ? 'var(--success)' : 'var(--danger)' }}>{pPts > 0 ? '+' : ''}{pPts}pts</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* 3. Mascot Assistant */}
      {myId && (
        <MascotHint
          message={mascotMessage}
          pose={liveFixtures.some(f => myTeamIds.includes(String(f.home_team_api_id)) || myTeamIds.includes(String(f.away_team_api_id))) ? 'excited' : 'idle'}
          size={72}
          style={{ marginBottom: 16 }}
        />
      )}

      {/* 4. Leaderboard rankings */}
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
              onRename={isHost ? handleRename : null}
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
