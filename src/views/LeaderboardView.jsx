import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getSession } from '../lib/session';
import { useScores } from '../hooks/useScores';
import { usePlayers } from '../hooks/usePlayers';
import { useDraft } from '../hooks/useDraft';
import { RESULT_TYPES, SCORING } from '../lib/constants';
import LeaderboardRow from '../components/LeaderboardRow';

export default function LeaderboardView() {
  const { gameId } = useParams();
  const session = getSession();
  const isHost = !!session?.hostToken;

  const { scores, loading: scoresLoading } = useScores(gameId);
  const { players } = usePlayers(gameId);
  const { picks: draftPicks } = useDraft(gameId);

  const [teams, setTeams] = useState([]);
  const [allPlayers, setAllPlayers] = useState([]);
  const [playerPicks, setPlayerPicks] = useState([]);
  const [captainPicks, setCaptainPicks] = useState([]);
  const [expandedRow, setExpandedRow] = useState(null);

  // Host controls state
  const [resultTeam, setResultTeam] = useState('');
  const [resultType, setResultType] = useState('');
  const [bonusPlayerId, setBonusPlayerId] = useState('');
  const [bonusPoints, setBonusPoints] = useState('');
  const [bonusNote, setBonusNote] = useState('');
  const [hostMsg, setHostMsg] = useState('');

  useEffect(() => {
    async function loadData() {
      const [teamsRes, playersRes, ppRes, cpRes] = await Promise.all([
        supabase.from('teams').select('*'),
        supabase.from('players').select('*'),
        supabase.from('player_picks').select('*').eq('game_id', gameId),
        supabase.from('captain_picks').select('*').eq('game_id', gameId),
      ]);
      if (teamsRes.data) setTeams(teamsRes.data);
      if (playersRes.data) setAllPlayers(playersRes.data);
      if (ppRes.data) setPlayerPicks(ppRes.data);
      if (cpRes.data) setCaptainPicks(cpRes.data);
    }
    loadData();
  }, [gameId]);

  async function recomputeScores() {
    // For each player, aggregate points from breakdown in user_scores
    // Re-fetch and resort
    const { data } = await supabase
      .from('user_scores')
      .select('*')
      .eq('game_id', gameId);
    // Trigger re-fetch via useScores realtime
    return data;
  }

  async function ensureUserScore(gamePlayerId) {
    const { data } = await supabase
      .from('user_scores')
      .select('*')
      .eq('game_id', gameId)
      .eq('game_player_id', gamePlayerId)
      .maybeSingle();
    if (!data) {
      const { data: inserted } = await supabase
        .from('user_scores')
        .insert({ game_id: gameId, game_player_id: gamePlayerId, total_points: 0, breakdown: {} })
        .select()
        .single();
      return inserted;
    }
    return data;
  }

  async function handleAddResult(e) {
    e.preventDefault();
    if (!resultTeam || !resultType) return;
    setHostMsg('');

    const points = SCORING[resultType] || 0;
    if (points === 0 && resultType !== 'group_loss') {
      setHostMsg('No points for this result type.');
    }

    // Find all players who drafted this team
    const teamPicks = draftPicks.filter((p) => String(p.team_api_id) === String(resultTeam));

    for (const pick of teamPicks) {
      const score = await ensureUserScore(pick.game_player_id);
      const breakdown = { ...(score.breakdown || {}), [`${resultType}_${resultTeam}`]: points };
      const total = Object.values(breakdown).reduce((a, b) => a + b, 0);
      await supabase
        .from('user_scores')
        .update({ total_points: total, breakdown, updated_at: new Date().toISOString() })
        .eq('id', score.id);
    }

    setHostMsg(`✓ Added ${points} pts to ${teamPicks.length} player(s)`);
    setResultTeam('');
    setResultType('');
  }

  async function handleAddBonus(e) {
    e.preventDefault();
    if (!bonusPlayerId || !bonusPoints) return;
    setHostMsg('');

    const pts = Number(bonusPoints);
    const score = await ensureUserScore(bonusPlayerId);
    const key = bonusNote || `bonus_${Date.now()}`;
    const breakdown = { ...(score.breakdown || {}), [key]: pts };
    const total = Object.values(breakdown).reduce((a, b) => a + b, 0);
    await supabase
      .from('user_scores')
      .update({ total_points: total, breakdown, updated_at: new Date().toISOString() })
      .eq('id', score.id);

    setHostMsg(`✓ Added ${pts} pts to player`);
    setBonusPlayerId('');
    setBonusPoints('');
    setBonusNote('');
  }

  async function handleOverride({ gamePlayerId, points, note }) {
    const score = await ensureUserScore(gamePlayerId);
    const key = note || `override_${Date.now()}`;
    const breakdown = { ...(score.breakdown || {}), [key]: points };
    const total = Object.values(breakdown).reduce((a, b) => a + b, 0);
    await supabase
      .from('user_scores')
      .update({ total_points: total, breakdown, updated_at: new Date().toISOString() })
      .eq('id', score.id);
    setHostMsg(`✓ Override applied`);
  }

  function getCaptainForPlayer(gamePlayerId) {
    const cp = captainPicks.find((c) => String(c.game_player_id) === String(gamePlayerId));
    return cp ? String(cp.player_api_id) : null;
  }

  if (scoresLoading) {
    return (
      <div className="page">
        <div className="loading">
          <div className="spinner" />
          Loading leaderboard...
        </div>
      </div>
    );
  }

  // Build display list: merge scores + players who may have 0 points
  const playerMap = {};
  players.forEach((p) => { playerMap[p.id] = p; });

  const scoreEntries = scores.map((s) => ({
    score: s,
    player: playerMap[s.game_player_id] || s.game_players,
  }));

  // Add players with no score entry
  players.forEach((p) => {
    if (!scores.find((s) => s.game_player_id === p.id)) {
      scoreEntries.push({ score: { total_points: 0, breakdown: {}, game_player_id: p.id }, player: p });
    }
  });

  scoreEntries.sort((a, b) => (b.score.total_points || 0) - (a.score.total_points || 0));

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 860 }}>
        <h1 className="page-title">🏆 Leaderboard</h1>

        {/* Leaderboard */}
        <div className="mb-6">
          {scoreEntries.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📊</div>
              <div className="empty-state-title">No scores yet</div>
            </div>
          ) : (
            scoreEntries.map(({ score, player }, i) => (
              <LeaderboardRow
                key={player?.id || i}
                rank={i + 1}
                player={player}
                score={score}
                picks={draftPicks}
                playerPicks={playerPicks}
                captainPickId={getCaptainForPlayer(player?.id || score.game_player_id)}
                teams={teams}
                players={allPlayers}
                isExpanded={expandedRow === (player?.id || i)}
                onToggle={() =>
                  setExpandedRow((prev) => (prev === (player?.id || i) ? null : (player?.id || i)))
                }
                isHost={isHost}
                onOverride={handleOverride}
              />
            ))
          )}
        </div>

        {/* Host panel */}
        {isHost && (
          <div className="card">
            <div className="section-title">🎯 Host Controls</div>
            {hostMsg && (
              <div className="badge badge-success mb-3" style={{ display: 'block' }}>
                {hostMsg}
              </div>
            )}

            {/* Add team result */}
            <div className="mb-4">
              <div className="font-semibold text-sm mb-2">Add Team Result</div>
              <form onSubmit={handleAddResult} className="flex gap-2 wrap">
                <select
                  className="select"
                  style={{ flex: 1, minWidth: 160 }}
                  value={resultTeam}
                  onChange={(e) => setResultTeam(e.target.value)}
                >
                  <option value="">Select team...</option>
                  {teams.map((t) => (
                    <option key={t.api_id} value={t.api_id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <select
                  className="select"
                  style={{ flex: 1, minWidth: 200 }}
                  value={resultType}
                  onChange={(e) => setResultType(e.target.value)}
                >
                  <option value="">Select result...</option>
                  {RESULT_TYPES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="btn btn-gold"
                  disabled={!resultTeam || !resultType}
                >
                  Apply
                </button>
              </form>
            </div>

            <hr className="divider" />

            {/* Add player bonus */}
            <div>
              <div className="font-semibold text-sm mb-2">Add Player Bonus</div>
              <form onSubmit={handleAddBonus} className="flex gap-2 wrap">
                <select
                  className="select"
                  style={{ flex: 1, minWidth: 160 }}
                  value={bonusPlayerId}
                  onChange={(e) => setBonusPlayerId(e.target.value)}
                >
                  <option value="">Select player...</option>
                  {players.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.player_name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  className="input"
                  placeholder="Points"
                  value={bonusPoints}
                  onChange={(e) => setBonusPoints(e.target.value)}
                  style={{ width: 90 }}
                />
                <input
                  type="text"
                  className="input"
                  placeholder="Note"
                  value={bonusNote}
                  onChange={(e) => setBonusNote(e.target.value)}
                  style={{ flex: 1 }}
                />
                <button
                  type="submit"
                  className="btn btn-gold"
                  disabled={!bonusPlayerId || !bonusPoints}
                >
                  Apply
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
