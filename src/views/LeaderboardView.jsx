import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useScores } from '../hooks/useScores';
import { usePlayers } from '../hooks/usePlayers';
import { useDraft } from '../hooks/useDraft';
import { supabase } from '../lib/supabase';
import { getOrCreateToken } from '../lib/session';
import LeaderboardRow from '../components/LeaderboardRow';
import { RESULT_TYPES, BONUS_TYPES } from '../lib/constants';
import { TEAM_POINTS, PLAYER_POINTS } from '../lib/scoring';

export default function LeaderboardView() {
  const { gameId } = useParams();
  const { scores, loading: scoresLoading } = useScores(gameId);
  const { players, loading: playersLoading } = usePlayers(gameId);
  const { picks } = useDraft(gameId);
  const myToken = getOrCreateToken();
  const me = players.find(p => p.player_token === myToken);
  const isHost = me?.is_host;

  const [expandedId, setExpandedId] = useState(null);
  const [teams, setTeams] = useState([]);
  const [allPlayers, setAllPlayers] = useState([]);

  // Host controls
  const [resultForm, setResultForm] = useState({ team_api_id: '', result_type: 'group_win', multiplier: 1 });
  const [bonusForm, setBonusForm] = useState({ player_api_id: '', bonus_type: 'goal', amount: 1 });
  const [hostLoading, setHostLoading] = useState(false);
  const [hostMsg, setHostMsg] = useState('');

  useEffect(() => {
    supabase.from('teams').select('*').then(({ data }) => setTeams(data || []));
    supabase.from('players').select('*').then(({ data }) => setAllPlayers(data || []));
  }, []);

  const recomputeScores = async (gId) => {
    // Get all game players
    const { data: gamePlayers } = await supabase.from('game_players').select('*').eq('game_id', gId);
    if (!gamePlayers) return;

    for (const gp of gamePlayers) {
      // Get this player's team picks
      const { data: teamPicks } = await supabase.from('draft_picks').select('team_api_id').eq('game_player_id', gp.id);
      const teamIds = (teamPicks || []).map(t => t.team_api_id);

      // Get team results for these teams
      let teamPts = 0;
      if (teamIds.length > 0) {
        const { data: results } = await supabase.from('team_results').select('*').in('team_api_id', teamIds);
        teamPts = (results || []).reduce((sum, r) => sum + (TEAM_POINTS[r.result_type] || 0) * (r.multiplier || 1), 0);
      }

      // Get this player's player picks
      const { data: playerPicks } = await supabase.from('player_picks').select('player_api_id').eq('game_player_id', gp.id);
      const playerIds = (playerPicks || []).map(p => p.player_api_id);

      // Get player bonuses
      let playerPts = 0;
      if (playerIds.length > 0) {
        const { data: bonuses } = await supabase.from('player_bonuses').select('*').in('player_api_id', playerIds);
        playerPts = (bonuses || []).reduce((sum, b) => sum + (PLAYER_POINTS[b.bonus_type] || 0) * (b.amount || 1), 0);
      }

      const total = teamPts + playerPts;

      // Upsert score
      await supabase.from('user_scores').upsert({
        game_id: gId,
        game_player_id: gp.id,
        team_points: teamPts,
        player_points: playerPts,
        total_points: total,
      }, { onConflict: 'game_id,game_player_id' });
    }

    setHostMsg('Scores recomputed!');
    setTimeout(() => setHostMsg(''), 3000);
  };

  const handleAddResult = async (e) => {
    e.preventDefault();
    setHostLoading(true);
    setHostMsg('');
    try {
      const { error } = await supabase.from('team_results').insert({
        game_id: gameId,
        team_api_id: resultForm.team_api_id,
        result_type: resultForm.result_type,
        multiplier: Number(resultForm.multiplier) || 1,
      });
      if (error) throw error;
      await recomputeScores(gameId);
      setResultForm(f => ({ ...f, team_api_id: '' }));
      setHostMsg('Result added and scores updated!');
    } catch (err) {
      setHostMsg('Error: ' + err.message);
    } finally {
      setHostLoading(false);
    }
  };

  const handleAddBonus = async (e) => {
    e.preventDefault();
    setHostLoading(true);
    setHostMsg('');
    try {
      const { error } = await supabase.from('player_bonuses').insert({
        game_id: gameId,
        player_api_id: bonusForm.player_api_id,
        bonus_type: bonusForm.bonus_type,
        amount: Number(bonusForm.amount) || 1,
      });
      if (error) throw error;
      await recomputeScores(gameId);
      setBonusForm(f => ({ ...f, player_api_id: '' }));
      setHostMsg('Bonus added and scores updated!');
    } catch (err) {
      setHostMsg('Error: ' + err.message);
    } finally {
      setHostLoading(false);
    }
  };

  const handleOverride = async (playerId, pts) => {
    await supabase.from('user_scores').upsert({
      game_id: gameId,
      game_player_id: playerId,
      override_points: pts,
    }, { onConflict: 'game_id,game_player_id' });
    await recomputeScores(gameId);
  };

  const rankedPlayers = players.map(p => {
    const score = scores.find(s => s.game_player_id === p.id);
    return { player: p, score: score || { total_points: 0, team_points: 0, player_points: 0 } };
  }).sort((a, b) => (b.score.total_points || 0) - (a.score.total_points || 0));

  if (scoresLoading || playersLoading) return <div className="page"><div className="spinner" /></div>;

  return (
    <div className="page">
      <h1 className="h1 mb-2">Leaderboard</h1>
      <p className="text-muted mb-6">Live standings for Copa Fantasy 2026.</p>

      <div className="mb-6">
        {rankedPlayers.length === 0 ? (
          <div className="card text-center">
            <p className="text-muted">No players yet.</p>
          </div>
        ) : (
          rankedPlayers.map(({ player, score }, i) => (
            <LeaderboardRow
              key={player.id}
              rank={i + 1}
              player={player}
              score={score}
              picks={picks.filter(pk => pk.game_player_id === player.id)}
              playerPicks={[]}
              captainPickId={player.captain_pick_id}
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
        <div>
          <h2 className="h2 mb-4">Host Controls</h2>

          {hostMsg && (
            <div style={{ background: 'var(--gold-dim)', border: '1px solid var(--gold)', borderRadius: 'var(--radius-sm)', padding: '10px 16px', marginBottom: 16, color: 'var(--gold)', fontSize: '0.9rem' }}>
              {hostMsg}
            </div>
          )}

          <div className="grid-2 mb-4">
            <div className="card">
              <h3 className="h3 mb-3">Add Team Result</h3>
              <form onSubmit={handleAddResult}>
                <div className="form-group">
                  <label className="label">Team</label>
                  <select
                    className="input"
                    value={resultForm.team_api_id}
                    onChange={e => setResultForm(f => ({ ...f, team_api_id: e.target.value }))}
                    required
                  >
                    <option value="">Select team...</option>
                    {teams.map(t => (
                      <option key={t.api_id} value={t.api_id}>{t.flag || ''} {t.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="label">Result Type</label>
                  <select
                    className="input"
                    value={resultForm.result_type}
                    onChange={e => setResultForm(f => ({ ...f, result_type: e.target.value }))}
                  >
                    {RESULT_TYPES.map(r => (
                      <option key={r.value} value={r.value}>{r.label} (+{r.points}pts)</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="label">Multiplier</label>
                  <input type="number" className="input" min="1" max="10" value={resultForm.multiplier}
                    onChange={e => setResultForm(f => ({ ...f, multiplier: e.target.value }))} />
                </div>
                <button className="btn btn-gold btn-full" type="submit" disabled={hostLoading || !resultForm.team_api_id}>
                  Add Result
                </button>
              </form>
            </div>

            <div className="card">
              <h3 className="h3 mb-3">Add Player Bonus</h3>
              <form onSubmit={handleAddBonus}>
                <div className="form-group">
                  <label className="label">Player</label>
                  <select
                    className="input"
                    value={bonusForm.player_api_id}
                    onChange={e => setBonusForm(f => ({ ...f, player_api_id: e.target.value }))}
                    required
                  >
                    <option value="">Select player...</option>
                    {allPlayers.map(p => (
                      <option key={p.api_id} value={p.api_id}>{p.name} ({p.position})</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="label">Bonus Type</label>
                  <select
                    className="input"
                    value={bonusForm.bonus_type}
                    onChange={e => setBonusForm(f => ({ ...f, bonus_type: e.target.value }))}
                  >
                    {BONUS_TYPES.map(b => (
                      <option key={b.value} value={b.value}>{b.label} ({b.points > 0 ? '+' : ''}{b.points}pts)</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="label">Amount</label>
                  <input type="number" className="input" min="1" max="20" value={bonusForm.amount}
                    onChange={e => setBonusForm(f => ({ ...f, amount: e.target.value }))} />
                </div>
                <button className="btn btn-gold btn-full" type="submit" disabled={hostLoading || !bonusForm.player_api_id}>
                  Add Bonus
                </button>
              </form>
            </div>
          </div>

          <div className="card text-center">
            <h3 className="h3 mb-2">Recompute All Scores</h3>
            <p className="text-muted text-sm mb-3">Recalculate total points for all players based on current results and bonuses.</p>
            <button className="btn btn-ghost" onClick={() => recomputeScores(gameId)} disabled={hostLoading}>
              {hostLoading ? 'Computing…' : 'Recompute Scores'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
