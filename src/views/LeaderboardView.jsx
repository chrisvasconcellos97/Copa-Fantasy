import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useScores } from '../hooks/useScores.js';
import { usePlayers } from '../hooks/usePlayers.js';
import { useDraft } from '../hooks/useDraft.js';
import { getSession } from '../lib/session.js';
import { supabase } from '../lib/supabase.js';
import { RESULT_TYPES, SCORING } from '../lib/constants.js';
import LeaderboardRow from '../components/LeaderboardRow.jsx';

export default function LeaderboardView() {
  const { gameId } = useParams();
  const session = getSession();
  const isHost = !!session.hostToken;

  const { scores, loading: scoresLoading } = useScores(gameId);
  const { players, loading: playersLoading } = usePlayers(gameId);
  const { picks: draftPicks, loading: picksLoading } = useDraft(gameId);

  const [teams, setTeams] = useState([]);
  const [allPlayers, setAllPlayers] = useState([]);
  const [playerPicks, setPlayerPicks] = useState([]);
  const [captainPicks, setCaptainPicks] = useState([]);
  const [expandedRow, setExpandedRow] = useState(null);

  // Host controls
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [selectedResult, setSelectedResult] = useState('');
  const [bonusPlayerId, setBonusPlayerId] = useState('');
  const [bonusPoints, setBonusPoints] = useState('');
  const [bonusNote, setBonusNote] = useState('');
  const [hostLoading, setHostLoading] = useState(false);
  const [hostMsg, setHostMsg] = useState('');

  useEffect(() => {
    async function load() {
      const [{ data: teamsData }, { data: playersData }, { data: ppData }, { data: cpData }] = await Promise.all([
        supabase.from('teams').select('*'),
        supabase.from('players').select('*'),
        supabase.from('player_picks').select('*').eq('game_id', gameId),
        supabase.from('captain_picks').select('*').eq('game_id', gameId),
      ]);
      setTeams(teamsData || []);
      setAllPlayers(playersData || []);
      setPlayerPicks(ppData || []);
      setCaptainPicks(cpData || []);
    }
    if (gameId) load();
  }, [gameId]);

  const recomputeScores = useCallback(async () => {
    // Fetch all data needed
    const { data: allScores } = await supabase.from('user_scores').select('*').eq('game_id', gameId);
    // Re-query to get fresh data
    const { data: freshScores } = await supabase
      .from('user_scores')
      .select('*')
      .eq('game_id', gameId)
      .order('total_points', { ascending: false });
    return freshScores;
  }, [gameId]);

  async function handleAddTeamResult() {
    if (!selectedTeamId || !selectedResult) return;
    setHostLoading(true);
    setHostMsg('');
    try {
      const points = SCORING[selectedResult] || 0;
      // Find all game_players who have this team
      const teamOwners = draftPicks.filter((p) => p.team_api_id === selectedTeamId);

      for (const dp of teamOwners) {
        const existing = scores.find((s) => s.game_player_id === dp.game_player_id);
        const currentPts = existing ? existing.total_points : 0;
        const currentBreakdown = existing ? (existing.breakdown || {}) : {};
        const newBreakdown = {
          ...currentBreakdown,
          [`${selectedTeamId}:${selectedResult}`]: (currentBreakdown[`${selectedTeamId}:${selectedResult}`] || 0) + points,
        };
        const newTotal = currentPts + points;

        if (existing) {
          await supabase
            .from('user_scores')
            .update({ total_points: newTotal, breakdown: newBreakdown, updated_at: new Date().toISOString() })
            .eq('id', existing.id);
        } else {
          await supabase.from('user_scores').insert({
            game_id: gameId,
            game_player_id: dp.game_player_id,
            total_points: newTotal,
            breakdown: newBreakdown,
          });
        }
      }

      setHostMsg(`Added ${points} pts to ${teamOwners.length} player(s) for ${selectedResult}`);
      setSelectedTeamId('');
      setSelectedResult('');
    } catch (err) {
      setHostMsg('Error: ' + err.message);
    }
    setHostLoading(false);
  }

  async function handleAddBonus() {
    if (!bonusPlayerId || !bonusPoints) return;
    setHostLoading(true);
    setHostMsg('');
    try {
      const pts = parseInt(bonusPoints, 10);
      const existing = scores.find((s) => s.game_player_id === bonusPlayerId);
      const currentPts = existing ? existing.total_points : 0;
      const currentBreakdown = existing ? (existing.breakdown || {}) : {};
      const key = bonusNote || 'bonus';
      const newBreakdown = { ...currentBreakdown, [key]: (currentBreakdown[key] || 0) + pts };
      const newTotal = currentPts + pts;

      if (existing) {
        await supabase
          .from('user_scores')
          .update({ total_points: newTotal, breakdown: newBreakdown, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
      } else {
        await supabase.from('user_scores').insert({
          game_id: gameId,
          game_player_id: bonusPlayerId,
          total_points: newTotal,
          breakdown: newBreakdown,
        });
      }

      setHostMsg(`Added ${pts} pts to player`);
      setBonusPlayerId('');
      setBonusPoints('');
      setBonusNote('');
    } catch (err) {
      setHostMsg('Error: ' + err.message);
    }
    setHostLoading(false);
  }

  async function handleOverride(gamePlayerId, points, note) {
    setHostLoading(true);
    setHostMsg('');
    try {
      const existing = scores.find((s) => s.game_player_id === gamePlayerId);
      const currentBreakdown = existing ? (existing.breakdown || {}) : {};
      const key = note || 'override';
      const newBreakdown = { ...currentBreakdown, [key]: (currentBreakdown[key] || 0) + points };
      const newTotal = (existing ? existing.total_points : 0) + points;

      if (existing) {
        await supabase
          .from('user_scores')
          .update({ total_points: newTotal, breakdown: newBreakdown, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
      } else {
        await supabase.from('user_scores').insert({
          game_id: gameId,
          game_player_id: gamePlayerId,
          total_points: newTotal,
          breakdown: newBreakdown,
        });
      }
      setHostMsg(`Score override applied`);
    } catch (err) {
      setHostMsg('Error: ' + err.message);
    }
    setHostLoading(false);
  }

  const loading = scoresLoading || playersLoading || picksLoading;

  // Build ranked list: include all players, even those with no score
  const rankedPlayers = players
    .map((p) => ({
      player: p,
      score: scores.find((s) => s.game_player_id === p.id) || null,
    }))
    .sort((a, b) => (b.score?.total_points || 0) - (a.score?.total_points || 0));

  const captainMap = {};
  captainPicks.forEach((cp) => { captainMap[cp.game_player_id] = cp.player_api_id; });

  return (
    <div className="page">
      <div className="container">
        <h1 style={{ marginBottom: 8 }}>Leaderboard</h1>
        <p className="text-muted text-sm" style={{ marginBottom: 24 }}>Live standings for your Copa Fantasy league</p>

        {loading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : (
          <>
            {rankedPlayers.length === 0 && (
              <div className="card text-center text-muted" style={{ padding: 40 }}>
                No players yet.
              </div>
            )}
            {rankedPlayers.map(({ player, score }, idx) => (
              <LeaderboardRow
                key={player.id}
                rank={idx + 1}
                player={player}
                score={score}
                picks={draftPicks}
                playerPicks={playerPicks}
                captainPickId={captainMap[player.id]}
                teams={teams}
                players={allPlayers}
                isExpanded={expandedRow === player.id}
                onToggle={() => setExpandedRow(expandedRow === player.id ? null : player.id)}
                isHost={isHost}
                onOverride={handleOverride}
              />
            ))}
          </>
        )}

        {isHost && (
          <div className="card" style={{ marginTop: 32 }}>
            <h2 style={{ marginBottom: 20 }}>Host Controls</h2>

            {hostMsg && (
              <div style={{ background: 'rgba(76,175,125,0.15)', border: '1px solid var(--success)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: '0.85rem', color: 'var(--success)' }}>
                {hostMsg}
              </div>
            )}

            <div style={{ marginBottom: 24 }}>
              <h3 style={{ marginBottom: 12, fontSize: '0.95rem' }}>Add Team Result</h3>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <select
                  className="select"
                  value={selectedTeamId}
                  onChange={(e) => setSelectedTeamId(e.target.value)}
                  style={{ flex: 1, minWidth: 160 }}
                >
                  <option value="">Select team...</option>
                  {teams.map((t) => (
                    <option key={t.api_id} value={t.api_id}>{t.name}</option>
                  ))}
                </select>
                <select
                  className="select"
                  value={selectedResult}
                  onChange={(e) => setSelectedResult(e.target.value)}
                  style={{ flex: 1, minWidth: 160 }}
                >
                  <option value="">Select result...</option>
                  {RESULT_TYPES.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
                <button
                  className="btn btn-gold"
                  onClick={handleAddTeamResult}
                  disabled={hostLoading || !selectedTeamId || !selectedResult}
                >
                  Apply
                </button>
              </div>
            </div>

            <hr className="divider" />

            <div>
              <h3 style={{ marginBottom: 12, fontSize: '0.95rem' }}>Add Player Bonus</h3>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <select
                  className="select"
                  value={bonusPlayerId}
                  onChange={(e) => setBonusPlayerId(e.target.value)}
                  style={{ flex: 1, minWidth: 160 }}
                >
                  <option value="">Select player...</option>
                  {players.map((p) => (
                    <option key={p.id} value={p.id}>{p.player_name}</option>
                  ))}
                </select>
                <input
                  type="number"
                  className="input"
                  placeholder="Points"
                  value={bonusPoints}
                  onChange={(e) => setBonusPoints(e.target.value)}
                  style={{ width: 100 }}
                />
                <input
                  type="text"
                  className="input"
                  placeholder="Description"
                  value={bonusNote}
                  onChange={(e) => setBonusNote(e.target.value)}
                  style={{ flex: 1, minWidth: 120 }}
                />
                <button
                  className="btn btn-gold"
                  onClick={handleAddBonus}
                  disabled={hostLoading || !bonusPlayerId || !bonusPoints}
                >
                  Add Bonus
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
