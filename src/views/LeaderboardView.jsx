import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getSession } from '../lib/session';
import { useScores } from '../hooks/useScores';
import { usePlayers } from '../hooks/usePlayers';
import LeaderboardRow from '../components/LeaderboardRow';
import { SCORING, RESULT_TYPES } from '../lib/constants';

export default function LeaderboardView() {
  const { gameId } = useParams();
  const session = getSession();
  const isHost = Boolean(session?.hostToken);

  const { scores, loading: scoresLoading } = useScores(gameId);
  const { players, loading: playersLoading } = usePlayers(gameId);

  const [teams, setTeams] = useState([]);
  const [allPlayers, setAllPlayers] = useState([]);
  const [allDraftPicks, setAllDraftPicks] = useState([]);
  const [allPlayerPicks, setAllPlayerPicks] = useState([]);
  const [allCaptainPicks, setAllCaptainPicks] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);

  // Host controls state
  const [selectedResultTeam, setSelectedResultTeam] = useState('');
  const [selectedResultType, setSelectedResultType] = useState('');
  const [applyingResult, setApplyingResult] = useState(false);
  const [resultMsg, setResultMsg] = useState('');

  const [bonusPlayerId, setBonusPlayerId] = useState('');
  const [bonusPoints, setBonusPoints] = useState('');
  const [bonusNote, setBonusNote] = useState('');
  const [applyingBonus, setApplyingBonus] = useState(false);
  const [bonusMsg, setBonusMsg] = useState('');

  useEffect(() => {
    async function loadData() {
      const [teamsRes, playersRes, draftRes, playerPicksRes, captainRes] = await Promise.all([
        supabase.from('teams').select('*'),
        supabase.from('players').select('*'),
        supabase.from('draft_picks').select('*').eq('game_id', gameId),
        supabase.from('player_picks').select('*').eq('game_id', gameId),
        supabase.from('captain_picks').select('*').eq('game_id', gameId),
      ]);
      setTeams(teamsRes.data || []);
      setAllPlayers(playersRes.data || []);
      setAllDraftPicks(draftRes.data || []);
      setAllPlayerPicks(playerPicksRes.data || []);
      setAllCaptainPicks(captainRes.data || []);
      setDataLoading(false);
    }
    loadData();
  }, [gameId]);

  // Build ranked list: merge scores with players
  const ranked = players
    .map((player) => {
      const score = scores.find((s) => s.game_player_id === player.id);
      return { player, score: score || { total_points: 0, breakdown: {} } };
    })
    .sort((a, b) => (b.score.total_points || 0) - (a.score.total_points || 0));

  async function ensureScoreRow(gamePlayerId) {
    const { data } = await supabase
      .from('user_scores')
      .select('id')
      .eq('game_id', gameId)
      .eq('game_player_id', gamePlayerId)
      .single();
    if (!data) {
      await supabase.from('user_scores').insert({
        game_id: gameId,
        game_player_id: gamePlayerId,
        total_points: 0,
        breakdown: {},
      });
    }
  }

  async function handleApplyResult() {
    if (!selectedResultTeam || !selectedResultType) return;
    setApplyingResult(true);
    setResultMsg('');

    const pts = SCORING[selectedResultType] || 0;

    // Find all players who have this team
    const picksForTeam = allDraftPicks.filter(
      (dp) => dp.team_api_id === selectedResultTeam
    );

    for (const dp of picksForTeam) {
      await ensureScoreRow(dp.game_player_id);
      const existing = scores.find((s) => s.game_player_id === dp.game_player_id);
      const currentBreakdown = existing?.breakdown || {};
      const newBreakdown = {
        ...currentBreakdown,
        [selectedResultType]: (currentBreakdown[selectedResultType] || 0) + pts,
      };
      const newTotal = (existing?.total_points || 0) + pts;

      await supabase
        .from('user_scores')
        .update({ total_points: newTotal, breakdown: newBreakdown, updated_at: new Date().toISOString() })
        .eq('game_id', gameId)
        .eq('game_player_id', dp.game_player_id);
    }

    const teamName = teams.find((t) => t.api_id === selectedResultTeam)?.name || selectedResultTeam;
    setResultMsg(`✅ Applied ${pts} pts to ${picksForTeam.length} player(s) who own ${teamName}`);
    setApplyingResult(false);
  }

  async function handleApplyBonus() {
    if (!bonusPlayerId || !bonusPoints) return;
    setApplyingBonus(true);
    setBonusMsg('');

    const pts = parseInt(bonusPoints, 10);
    if (isNaN(pts)) {
      setBonusMsg('Invalid points value');
      setApplyingBonus(false);
      return;
    }

    await ensureScoreRow(bonusPlayerId);
    const existing = scores.find((s) => s.game_player_id === bonusPlayerId);
    const currentBreakdown = existing?.breakdown || {};
    const key = bonusNote || 'manual_bonus';
    const newBreakdown = {
      ...currentBreakdown,
      [key]: (currentBreakdown[key] || 0) + pts,
    };
    const newTotal = (existing?.total_points || 0) + pts;

    await supabase
      .from('user_scores')
      .update({ total_points: newTotal, breakdown: newBreakdown, updated_at: new Date().toISOString() })
      .eq('game_id', gameId)
      .eq('game_player_id', bonusPlayerId);

    const playerName = players.find((p) => p.id === bonusPlayerId)?.player_name || bonusPlayerId;
    setBonusMsg(`✅ Applied ${pts} pts to ${playerName}`);
    setBonusPoints('');
    setBonusNote('');
    setApplyingBonus(false);
  }

  async function handleOverride(gamePlayerId, pts, note) {
    await ensureScoreRow(gamePlayerId);
    const existing = scores.find((s) => s.game_player_id === gamePlayerId);
    const currentBreakdown = existing?.breakdown || {};
    const key = note || 'override';
    const newBreakdown = { ...currentBreakdown, [key]: (currentBreakdown[key] || 0) + pts };
    const newTotal = (existing?.total_points || 0) + pts;
    await supabase
      .from('user_scores')
      .update({ total_points: newTotal, breakdown: newBreakdown, updated_at: new Date().toISOString() })
      .eq('game_id', gameId)
      .eq('game_player_id', gamePlayerId);
  }

  if (scoresLoading || playersLoading || dataLoading) {
    return (
      <div className="loading-page">
        <div className="loading-spinner" />
        <span>Loading leaderboard...</span>
      </div>
    );
  }

  return (
    <div className="page">
      <h1 className="page-title">🏆 Leaderboard</h1>

      {/* Leaderboard */}
      <div className="flex flex-col gap-3 mb-6">
        {ranked.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state__icon">📊</div>
            <div className="empty-state__title">No scores yet</div>
          </div>
        ) : (
          ranked.map(({ player, score }, idx) => {
            const rank = idx + 1;
            const playerDraftPicks = allDraftPicks.filter((dp) => dp.game_player_id === player.id);
            const playerPicksList = allPlayerPicks.filter((pp) => pp.game_player_id === player.id);
            const captainPick = allCaptainPicks.find((cp) => cp.game_player_id === player.id);
            return (
              <LeaderboardRow
                key={player.id}
                rank={rank}
                player={player}
                score={score}
                picks={playerDraftPicks}
                playerPicks={playerPicksList}
                captainPickId={captainPick?.player_api_id}
                teams={teams}
                players={allPlayers}
                isExpanded={expandedId === player.id}
                onToggle={() => setExpandedId(expandedId === player.id ? null : player.id)}
                isHost={isHost}
                onOverride={handleOverride}
              />
            );
          })
        )}
      </div>

      {/* Host Controls */}
      {isHost && (
        <div className="card">
          <div className="card-title">🎛️ Host Controls</div>

          {/* Apply Team Result */}
          <div className="mb-6">
            <div className="text-sm font-semibold mb-3">Apply Team Result</div>
            <div className="flex gap-2 flex-wrap mb-2">
              <select
                className="input"
                style={{ flex: 1, minWidth: 160 }}
                value={selectedResultTeam}
                onChange={(e) => setSelectedResultTeam(e.target.value)}
              >
                <option value="">Select team...</option>
                {teams.map((t) => (
                  <option key={t.api_id} value={t.api_id}>{t.name}</option>
                ))}
              </select>
              <select
                className="input"
                style={{ flex: 1, minWidth: 180 }}
                value={selectedResultType}
                onChange={(e) => setSelectedResultType(e.target.value)}
              >
                <option value="">Select result...</option>
                {RESULT_TYPES.map((rt) => (
                  <option key={rt.value} value={rt.value}>{rt.label}</option>
                ))}
              </select>
              <button
                className="btn btn-primary"
                onClick={handleApplyResult}
                disabled={applyingResult || !selectedResultTeam || !selectedResultType}
              >
                {applyingResult ? '...' : 'Apply'}
              </button>
            </div>
            {resultMsg && <div className="text-success text-sm">{resultMsg}</div>}
          </div>

          <div className="divider" />

          {/* Apply Player Bonus */}
          <div>
            <div className="text-sm font-semibold mb-3">Apply Player Bonus</div>
            <div className="flex gap-2 flex-wrap mb-2">
              <select
                className="input"
                style={{ flex: 1, minWidth: 160 }}
                value={bonusPlayerId}
                onChange={(e) => setBonusPlayerId(e.target.value)}
              >
                <option value="">Select player...</option>
                {players.map((p) => (
                  <option key={p.id} value={p.id}>{p.player_name}</option>
                ))}
              </select>
              <input
                className="input"
                style={{ maxWidth: 100 }}
                type="number"
                placeholder="Points"
                value={bonusPoints}
                onChange={(e) => setBonusPoints(e.target.value)}
              />
              <input
                className="input"
                style={{ flex: 1, minWidth: 120 }}
                type="text"
                placeholder="Description"
                value={bonusNote}
                onChange={(e) => setBonusNote(e.target.value)}
              />
              <button
                className="btn btn-primary"
                onClick={handleApplyBonus}
                disabled={applyingBonus || !bonusPlayerId || !bonusPoints}
              >
                {applyingBonus ? '...' : 'Apply'}
              </button>
            </div>
            {bonusMsg && <div className="text-success text-sm">{bonusMsg}</div>}
          </div>
        </div>
      )}
    </div>
  );
}
