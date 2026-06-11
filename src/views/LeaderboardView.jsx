import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getSession } from '../lib/session';
import { useScores } from '../hooks/useScores';
import { usePlayers } from '../hooks/usePlayers';
import { RESULT_TYPES, BONUS_TYPES } from '../lib/constants';
import LeaderboardRow from '../components/LeaderboardRow';

export default function LeaderboardView() {
  const { gameId } = useParams();
  const session = getSession();
  const isHost = !!session?.hostToken;

  const { scores, loading: scoresLoading } = useScores(gameId);
  const { players } = usePlayers(gameId);

  const [picks, setPicks] = useState([]);
  const [playerPicks, setPlayerPicks] = useState([]);
  const [captainPicks, setCaptainPicks] = useState([]);
  const [teams, setTeams] = useState([]);
  const [allPlayers, setAllPlayers] = useState([]);
  const [expandedId, setExpandedId] = useState(null);

  // Host controls
  const [resultTeamId, setResultTeamId] = useState('');
  const [resultType, setResultType] = useState('group_win');
  const [bonusPlayerId, setBonusPlayerId] = useState('');
  const [bonusPoints, setBonusPoints] = useState('');
  const [bonusDesc, setBonusDesc] = useState('');
  const [applying, setApplying] = useState(false);
  const [hostMsg, setHostMsg] = useState('');

  useEffect(() => {
    if (!gameId) return;
    async function loadAll() {
      const [picksRes, ppRes, cpRes, teamsRes, playersRes] = await Promise.all([
        supabase.from('draft_picks').select('*').eq('game_id', gameId),
        supabase.from('player_picks').select('*').eq('game_id', gameId),
        supabase.from('captain_picks').select('*').eq('game_id', gameId),
        supabase.from('teams').select('*'),
        supabase.from('players').select('*'),
      ]);
      if (!picksRes.error) setPicks(picksRes.data || []);
      if (!ppRes.error) setPlayerPicks(ppRes.data || []);
      if (!cpRes.error) setCaptainPicks(cpRes.data || []);
      if (!teamsRes.error) setTeams(teamsRes.data || []);
      if (!playersRes.error) setAllPlayers(playersRes.data || []);
    }
    loadAll();
  }, [gameId]);

  const resultPoints = {
    group_win: 3, group_draw: 1, group_loss: 0,
    r32_win: 5, qf_win: 8, sf_win: 13, final_win: 21, champion: 34,
  };

  async function applyTeamResult() {
    if (!resultTeamId || applying) return;
    setApplying(true);
    setHostMsg('');
    try {
      const pts = resultPoints[resultType] ?? 0;
      // Find all game_players who have this team
      const ownerIds = picks
        .filter((p) => p.team_api_id === resultTeamId)
        .map((p) => p.game_player_id);

      for (const gpId of ownerIds) {
        const existing = scores.find((s) => s.game_player_id === gpId);
        const currentPts = existing?.total_points ?? 0;
        const currentBreakdown = existing?.breakdown ?? {};
        const newBreakdown = {
          ...currentBreakdown,
          [resultType]: (currentBreakdown[resultType] || 0) + pts,
        };
        if (existing) {
          await supabase.from('user_scores')
            .update({ total_points: currentPts + pts, breakdown: newBreakdown, updated_at: new Date().toISOString() })
            .eq('id', existing.id);
        } else {
          await supabase.from('user_scores').insert({
            game_id: gameId,
            game_player_id: gpId,
            total_points: pts,
            breakdown: newBreakdown,
          });
        }
      }
      setHostMsg(`Applied ${pts} pts (${resultType}) to ${ownerIds.length} player(s)`);
    } catch (err) {
      setHostMsg('Error: ' + err.message);
    } finally {
      setApplying(false);
    }
  }

  async function applyBonus() {
    if (!bonusPlayerId || !bonusPoints || applying) return;
    const pts = parseInt(bonusPoints, 10);
    if (isNaN(pts)) return;
    setApplying(true);
    setHostMsg('');
    try {
      const existing = scores.find((s) => s.game_player_id === bonusPlayerId);
      const currentPts = existing?.total_points ?? 0;
      const currentBreakdown = existing?.breakdown ?? {};
      const key = bonusDesc || 'bonus';
      const newBreakdown = { ...currentBreakdown, [key]: (currentBreakdown[key] || 0) + pts };

      if (existing) {
        await supabase.from('user_scores')
          .update({ total_points: currentPts + pts, breakdown: newBreakdown, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
      } else {
        await supabase.from('user_scores').insert({
          game_id: gameId,
          game_player_id: bonusPlayerId,
          total_points: pts,
          breakdown: newBreakdown,
        });
      }
      setHostMsg(`Applied ${pts > 0 ? '+' : ''}${pts} pts to player`);
      setBonusPoints('');
      setBonusDesc('');
    } catch (err) {
      setHostMsg('Error: ' + err.message);
    } finally {
      setApplying(false);
    }
  }

  async function handleOverride(gamePlayerId, pts, desc) {
    const existing = scores.find((s) => s.game_player_id === gamePlayerId);
    const currentPts = existing?.total_points ?? 0;
    const currentBreakdown = existing?.breakdown ?? {};
    const key = desc || 'override';
    const newBreakdown = { ...currentBreakdown, [key]: (currentBreakdown[key] || 0) + pts };

    if (existing) {
      await supabase.from('user_scores')
        .update({ total_points: currentPts + pts, breakdown: newBreakdown, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
    } else {
      await supabase.from('user_scores').insert({
        game_id: gameId,
        game_player_id: gamePlayerId,
        total_points: pts,
        breakdown: newBreakdown,
      });
    }
  }

  // Sort players by score
  const sortedPlayers = [...players].sort((a, b) => {
    const aScore = scores.find((s) => s.game_player_id === a.id)?.total_points ?? 0;
    const bScore = scores.find((s) => s.game_player_id === b.id)?.total_points ?? 0;
    return bScore - aScore;
  });

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">🏆 Leaderboard</h1>
      </div>

      {scoresLoading ? (
        <div className="loading-center"><div className="spinner" /> Loading scores...</div>
      ) : (
        <div className="col gap-8 mb-24">
          {sortedPlayers.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🏆</div>
              <p>No players yet</p>
            </div>
          ) : (
            sortedPlayers.map((player, idx) => {
              const score = scores.find((s) => s.game_player_id === player.id);
              const captainPick = captainPicks.find((cp) => cp.game_player_id === player.id);
              return (
                <LeaderboardRow
                  key={player.id}
                  rank={idx + 1}
                  player={player}
                  score={score}
                  picks={picks}
                  playerPicks={playerPicks}
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
      )}

      {isHost && (
        <div className="col gap-16">
          <div className="card">
            <div className="card-title">🎮 Host Controls</div>

            <div className="col gap-12 mb-20">
              <div className="text-sm font-600 text-muted">AWARD TEAM RESULT</div>
              <div className="form-group">
                <label className="form-label">Team</label>
                <select className="select" value={resultTeamId} onChange={(e) => setResultTeamId(e.target.value)}>
                  <option value="">Select team...</option>
                  {teams.map((t) => (
                    <option key={t.api_id} value={t.api_id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Result</label>
                <select className="select" value={resultType} onChange={(e) => setResultType(e.target.value)}>
                  {RESULT_TYPES.map((rt) => (
                    <option key={rt.value} value={rt.value}>{rt.label}</option>
                  ))}
                </select>
              </div>
              <button className="btn btn-primary" onClick={applyTeamResult} disabled={!resultTeamId || applying}>
                {applying ? 'Applying...' : '✅ Apply Result'}
              </button>
            </div>

            <div className="divider" />

            <div className="col gap-12">
              <div className="text-sm font-600 text-muted">AWARD PLAYER BONUS</div>
              <div className="form-group">
                <label className="form-label">Player</label>
                <select className="select" value={bonusPlayerId} onChange={(e) => setBonusPlayerId(e.target.value)}>
                  <option value="">Select player...</option>
                  {players.map((p) => (
                    <option key={p.id} value={p.id}>{p.player_name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Points</label>
                <input
                  type="number"
                  className="input"
                  placeholder="e.g. 5 or -2"
                  value={bonusPoints}
                  onChange={(e) => setBonusPoints(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. Man of the Match"
                  value={bonusDesc}
                  onChange={(e) => setBonusDesc(e.target.value)}
                />
              </div>
              <button className="btn btn-primary" onClick={applyBonus} disabled={!bonusPlayerId || !bonusPoints || applying}>
                {applying ? 'Applying...' : '🎯 Apply Bonus'}
              </button>
            </div>

            {hostMsg && (
              <p className="text-success text-sm mt-12">{hostMsg}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
