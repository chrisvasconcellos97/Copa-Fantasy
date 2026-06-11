import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
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
  const isHost = Boolean(session?.hostToken);

  const { scores, loading: scoresLoading } = useScores(gameId);
  const { players } = usePlayers(gameId);
  const { picks } = useDraft(gameId);

  const [teams, setTeams] = useState([]);
  const [allPlayers, setAllPlayers] = useState([]);
  const [playerPicks, setPlayerPicks] = useState([]);
  const [captainPicks, setCaptainPicks] = useState([]);
  const [expandedId, setExpandedId] = useState(null);

  // Host controls
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [selectedResult, setSelectedResult] = useState('group_win');
  const [applyingResult, setApplyingResult] = useState(false);
  const [bonusPlayerId, setBonusPlayerId] = useState('');
  const [bonusPoints, setBonusPoints] = useState('');
  const [bonusNote, setBonusNote] = useState('');
  const [applyingBonus, setApplyingBonus] = useState(false);

  useEffect(() => {
    loadSupportData();
  }, [gameId]);

  async function loadSupportData() {
    const [{ data: t }, { data: p }, { data: pp }, { data: cp }] = await Promise.all([
      supabase.from('teams').select('*'),
      supabase.from('players').select('*'),
      supabase.from('player_picks').select('*').eq('game_id', gameId),
      supabase.from('captain_picks').select('*').eq('game_id', gameId),
    ]);
    if (t) setTeams(t);
    if (p) setAllPlayers(p);
    if (pp) setPlayerPicks(pp);
    if (cp) setCaptainPicks(cp);
  }

  function getPlayerScore(gamePlayerId) {
    return scores.find((s) => s.game_player_id === gamePlayerId);
  }

  function getCaptainPickId(gamePlayerId) {
    const cp = captainPicks.find((c) => c.game_player_id === gamePlayerId);
    return cp?.player_api_id || null;
  }

  // Apply team result: award points to all game_players who have that team
  async function handleApplyResult() {
    if (!selectedTeamId) return;
    setApplyingResult(true);
    try {
      const pts = SCORING[selectedResult] || 0;
      const teamPicks = picks.filter(
        (p) => String(p.team_api_id) === String(selectedTeamId)
      );

      for (const tp of teamPicks) {
        const existing = scores.find((s) => s.game_player_id === tp.game_player_id);
        const currentBreakdown = existing?.breakdown || {};
        const teamKey = `team_${selectedTeamId}`;
        const currentTeamPts = currentBreakdown[teamKey] || 0;
        const newTeamPts = currentTeamPts + pts;
        const newBreakdown = { ...currentBreakdown, [teamKey]: newTeamPts };
        const newTotal = Object.values(newBreakdown)
          .filter((v) => typeof v === 'number')
          .reduce((a, b) => a + b, 0);

        if (existing) {
          await supabase
            .from('user_scores')
            .update({ total_points: newTotal, breakdown: newBreakdown, updated_at: new Date().toISOString() })
            .eq('game_id', gameId)
            .eq('game_player_id', tp.game_player_id);
        } else {
          await supabase.from('user_scores').insert({
            game_id: gameId,
            game_player_id: tp.game_player_id,
            total_points: newTotal,
            breakdown: newBreakdown,
          });
        }
      }
      alert(`Applied ${pts} pts for ${selectedResult} to ${teamPicks.length} player(s).`);
    } catch (err) {
      alert(err.message);
    } finally {
      setApplyingResult(false);
    }
  }

  async function handleApplyBonus() {
    if (!bonusPlayerId || bonusPoints === '') return;
    setApplyingBonus(true);
    try {
      const pts = parseInt(bonusPoints, 10);
      const existing = scores.find((s) => s.game_player_id === bonusPlayerId);
      const currentBreakdown = existing?.breakdown || {};
      const bonusNotes = currentBreakdown.bonus_notes || [];
      bonusNotes.push({ pts, note: bonusNote, at: new Date().toISOString() });
      const currentBonus = currentBreakdown.manual_bonus || 0;
      const newBreakdown = { ...currentBreakdown, manual_bonus: currentBonus + pts, bonus_notes: bonusNotes };
      const newTotal = Object.values(newBreakdown)
        .filter((v) => typeof v === 'number')
        .reduce((a, b) => a + b, 0);

      if (existing) {
        await supabase
          .from('user_scores')
          .update({ total_points: newTotal, breakdown: newBreakdown, updated_at: new Date().toISOString() })
          .eq('game_id', gameId)
          .eq('game_player_id', bonusPlayerId);
      } else {
        await supabase.from('user_scores').insert({
          game_id: gameId,
          game_player_id: bonusPlayerId,
          total_points: newTotal,
          breakdown: newBreakdown,
        });
      }
      alert(`Applied ${pts} bonus pts.`);
      setBonusPoints('');
      setBonusNote('');
    } catch (err) {
      alert(err.message);
    } finally {
      setApplyingBonus(false);
    }
  }

  async function handleOverride(gamePlayerId, points, note) {
    try {
      const existing = scores.find((s) => s.game_player_id === gamePlayerId);
      const currentBreakdown = existing?.breakdown || {};
      const overrideNotes = currentBreakdown.override_notes || [];
      overrideNotes.push({ pts: points, note, at: new Date().toISOString() });
      const currentOverride = currentBreakdown.override || 0;
      const newBreakdown = {
        ...currentBreakdown,
        override: currentOverride + points,
        override_notes: overrideNotes,
      };
      const newTotal = Object.values(newBreakdown)
        .filter((v) => typeof v === 'number')
        .reduce((a, b) => a + b, 0);

      if (existing) {
        await supabase
          .from('user_scores')
          .update({ total_points: newTotal, breakdown: newBreakdown, updated_at: new Date().toISOString() })
          .eq('game_id', gameId)
          .eq('game_player_id', gamePlayerId);
      } else {
        await supabase.from('user_scores').insert({
          game_id: gameId,
          game_player_id: gamePlayerId,
          total_points: newTotal,
          breakdown: newBreakdown,
        });
      }
    } catch (err) {
      alert(err.message);
    }
  }

  // Sort players by score
  const rankedPlayers = [...players].sort((a, b) => {
    const sa = getPlayerScore(a.id)?.total_points ?? 0;
    const sb = getPlayerScore(b.id)?.total_points ?? 0;
    return sb - sa;
  });

  if (scoresLoading) {
    return <div className="loading-center"><div className="spinner" /></div>;
  }

  return (
    <div className="page container">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h2 style={{ color: 'var(--gold)' }}>🏆 Leaderboard</h2>
        <Link to="/matches" className="btn btn-ghost btn-sm">⚽ Matches</Link>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 32 }}>
        {rankedPlayers.length === 0 ? (
          <div className="empty-state">No players yet.</div>
        ) : (
          rankedPlayers.map((player, idx) => (
            <LeaderboardRow
              key={player.id}
              rank={idx + 1}
              player={player}
              score={getPlayerScore(player.id)}
              picks={picks}
              playerPicks={playerPicks}
              captainPickId={getCaptainPickId(player.id)}
              teams={teams}
              players={allPlayers}
              isExpanded={expandedId === player.id}
              onToggle={() => setExpandedId(expandedId === player.id ? null : player.id)}
              isHost={isHost}
              onOverride={handleOverride}
            />
          ))
        )}
      </div>

      {isHost && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <h3 style={{ color: 'var(--gold)' }}>🎮 Host Controls</h3>

          {/* Apply Team Result */}
          <div className="card">
            <h4 style={{ marginBottom: 14 }}>Award Team Result Points</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div className="input-group">
                <label>Select Team</label>
                <select
                  className="input"
                  value={selectedTeamId}
                  onChange={(e) => setSelectedTeamId(e.target.value)}
                >
                  <option value="">-- Choose team --</option>
                  {teams.map((t) => (
                    <option key={t.api_id} value={t.api_id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div className="input-group">
                <label>Result Type</label>
                <select
                  className="input"
                  value={selectedResult}
                  onChange={(e) => setSelectedResult(e.target.value)}
                >
                  {RESULT_TYPES.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
              <button
                className="btn btn-primary"
                onClick={handleApplyResult}
                disabled={applyingResult || !selectedTeamId}
              >
                {applyingResult ? 'Applying...' : 'Award Points'}
              </button>
            </div>
          </div>

          {/* Apply Player Bonus */}
          <div className="card">
            <h4 style={{ marginBottom: 14 }}>Add Player Bonus Points</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div className="input-group">
                <label>Player</label>
                <select
                  className="input"
                  value={bonusPlayerId}
                  onChange={(e) => setBonusPlayerId(e.target.value)}
                >
                  <option value="">-- Choose player --</option>
                  {players.map((p) => (
                    <option key={p.id} value={p.id}>{p.player_name}</option>
                  ))}
                </select>
              </div>
              <div className="input-group">
                <label>Bonus Points</label>
                <input
                  className="input"
                  type="number"
                  placeholder="e.g. 5"
                  value={bonusPoints}
                  onChange={(e) => setBonusPoints(e.target.value)}
                />
              </div>
              <div className="input-group">
                <label>Note (optional)</label>
                <input
                  className="input"
                  placeholder="e.g. Man of the Match"
                  value={bonusNote}
                  onChange={(e) => setBonusNote(e.target.value)}
                />
              </div>
              <button
                className="btn btn-primary"
                onClick={handleApplyBonus}
                disabled={applyingBonus || !bonusPlayerId || bonusPoints === ''}
              >
                {applyingBonus ? 'Applying...' : 'Add Bonus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
