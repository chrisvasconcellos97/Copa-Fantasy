import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getOrCreateToken, getPlayerName } from '../lib/session';
import { useScores } from '../hooks/useScores';
import { usePlayers } from '../hooks/usePlayers';
import { useDraft } from '../hooks/useDraft';
import LeaderboardRow from '../components/LeaderboardRow';
import { RESULT_TYPES, SCORING } from '../lib/constants';

export default function LeaderboardView() {
  const { gameId } = useParams();
  const myToken = getOrCreateToken();
  const { scores, loading: scoresLoading } = useScores(gameId);
  const { players } = usePlayers(gameId);
  const { picks } = useDraft(gameId);
  const [game, setGame] = useState(null);

  const [teams, setTeams] = useState([]);
  const [players2, setPlayers2] = useState([]); // all players (squad players)
  const [playerPicks, setPlayerPicks] = useState([]);
  const [captainPicks, setCaptainPicks] = useState([]);
  const [expandedId, setExpandedId] = useState(null);

  // Host controls
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [selectedResult, setSelectedResult] = useState('group_win');
  const [addingResult, setAddingResult] = useState(false);

  const [bonusPlayerId, setBonusPlayerId] = useState('');
  const [bonusPoints, setBonusPoints] = useState('');
  const [bonusNote, setBonusNote] = useState('');
  const [addingBonus, setAddingBonus] = useState(false);

  const [resultMsg, setResultMsg] = useState('');

  useEffect(() => {
    if (!gameId) return;
    Promise.all([
      supabase.from('games').select('*').eq('id', gameId).single(),
      supabase.from('teams').select('*'),
      supabase.from('players').select('*'),
      supabase.from('player_picks').select('*').eq('game_id', gameId),
      supabase.from('captain_picks').select('*').eq('game_id', gameId),
    ]).then(([{ data: g }, { data: tm }, { data: pl }, { data: pp }, { data: cp }]) => {
      setGame(g);
      setTeams(tm || []);
      setPlayers2(pl || []);
      setPlayerPicks(pp || []);
      setCaptainPicks(cp || []);
    });
  }, [gameId]);

  const isHost = session?.hostToken && game?.host_token === session?.hostToken;

  const getOrCreateScore = async (gamePlayerId) => {
    const { data: existing } = await supabase
      .from('user_scores')
      .select('*')
      .eq('game_id', gameId)
      .eq('game_player_id', gamePlayerId)
      .single();
    return existing;
  };

  const updateScore = async (gamePlayerId, additionalPoints, note) => {
    const existing = await getOrCreateScore(gamePlayerId);
    if (existing) {
      const newTotal = (existing.total_points || 0) + additionalPoints;
      const breakdown = typeof existing.breakdown === 'string'
        ? existing.breakdown + `\n${note}: +${additionalPoints}`
        : `${note}: +${additionalPoints}`;
      await supabase
        .from('user_scores')
        .update({ total_points: newTotal, breakdown, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
    } else {
      await supabase.from('user_scores').insert({
        game_id: gameId,
        game_player_id: gamePlayerId,
        total_points: additionalPoints,
        breakdown: `${note}: +${additionalPoints}`,
        updated_at: new Date().toISOString(),
      });
    }
  };

  const handleAddTeamResult = async () => {
    if (!selectedTeamId || addingResult) return;
    setAddingResult(true);
    setResultMsg('');
    try {
      const pts = SCORING[selectedResult] || 0;
      const note = RESULT_TYPES.find(r => r.value === selectedResult)?.label || selectedResult;

      // Find all game_player_ids who have this team
      const gamePlayers = picks.filter(p => p.team_api_id === selectedTeamId).map(p => p.game_player_id);
      const uniqueIds = [...new Set(gamePlayers)];

      await Promise.all(uniqueIds.map(gpId => updateScore(gpId, pts, note)));
      setResultMsg(`✓ Added ${pts} pts for ${uniqueIds.length} player(s)`);
    } catch (err) {
      setResultMsg('Error: ' + err.message);
    } finally {
      setAddingResult(false);
    }
  };

  const handleAddBonus = async () => {
    if (!bonusPlayerId || !bonusPoints || addingBonus) return;
    setAddingBonus(true);
    try {
      const pts = parseInt(bonusPoints, 10);
      if (isNaN(pts)) return;
      await updateScore(bonusPlayerId, pts, bonusNote || 'Bonus');
      setBonusPoints('');
      setBonusNote('');
      setResultMsg(`✓ Added ${pts} pts to player`);
    } catch (err) {
      setResultMsg('Error: ' + err.message);
    } finally {
      setAddingBonus(false);
    }
  };

  const handleOverride = async (gamePlayerId, pts, note) => {
    await updateScore(gamePlayerId, pts, note || 'Manual override');
  };

  if (scoresLoading) {
    return (
      <div className="loading-center page">
        <div className="spinner" />
        <span className="text-muted">Loading leaderboard...</span>
      </div>
    );
  }

  // Build ranked list
  const rankedPlayers = players.map(player => {
    const score = scores.find(s => s.game_player_id === player.id);
    const captainPick = captainPicks.find(c => c.game_player_id === player.id);
    return { player, score, captainPickId: captainPick?.player_api_id };
  }).sort((a, b) => (b.score?.total_points || 0) - (a.score?.total_points || 0));

  return (
    <div className="page">
      <div className="container">
        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>🏆 Leaderboard</h1>
        <p className="text-muted text-sm" style={{ marginBottom: 24 }}>Copa Fantasy 2026 Standings</p>

        {isHost && (
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="section-title" style={{ marginBottom: 12 }}>Host Controls</div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>Add Team Result</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <select
                  className="select"
                  value={selectedTeamId}
                  onChange={e => setSelectedTeamId(e.target.value)}
                  style={{ flex: 1, minWidth: 120 }}
                >
                  <option value="">Select Team...</option>
                  {teams.map(t => (
                    <option key={t.api_id} value={t.api_id}>{t.name}</option>
                  ))}
                </select>
                <select
                  className="select"
                  value={selectedResult}
                  onChange={e => setSelectedResult(e.target.value)}
                  style={{ flex: 1, minWidth: 160 }}
                >
                  {RESULT_TYPES.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
                <button className="btn btn-gold btn-sm" onClick={handleAddTeamResult} disabled={!selectedTeamId || addingResult}>
                  {addingResult ? 'Adding...' : 'Apply'}
                </button>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>Add Player Bonus</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <select
                  className="select"
                  value={bonusPlayerId}
                  onChange={e => setBonusPlayerId(e.target.value)}
                  style={{ flex: 1, minWidth: 140 }}
                >
                  <option value="">Select Player...</option>
                  {players.map(p => (
                    <option key={p.id} value={p.id}>{p.player_name}</option>
                  ))}
                </select>
                <input
                  className="input"
                  type="number"
                  placeholder="Points"
                  value={bonusPoints}
                  onChange={e => setBonusPoints(e.target.value)}
                  style={{ width: 80 }}
                />
                <input
                  className="input"
                  type="text"
                  placeholder="Note"
                  value={bonusNote}
                  onChange={e => setBonusNote(e.target.value)}
                  style={{ flex: 1 }}
                />
                <button className="btn btn-gold btn-sm" onClick={handleAddBonus} disabled={!bonusPlayerId || !bonusPoints || addingBonus}>
                  {addingBonus ? 'Adding...' : 'Add'}
                </button>
              </div>
            </div>

            {resultMsg && (
              <div style={{ fontSize: 13, color: resultMsg.startsWith('✓') ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
                {resultMsg}
              </div>
            )}
          </div>
        )}

        <div>
          {rankedPlayers.map(({ player, score, captainPickId: cpId }, idx) => (
            <LeaderboardRow
              key={player.id}
              rank={idx + 1}
              player={player}
              score={score}
              picks={picks}
              playerPicks={playerPicks}
              captainPickId={cpId}
              teams={teams}
              players={players2}
              isExpanded={expandedId === player.id}
              onToggle={() => setExpandedId(expandedId === player.id ? null : player.id)}
              isHost={isHost}
              onOverride={handleOverride}
            />
          ))}
          {rankedPlayers.length === 0 && (
            <div className="empty-state">
              <div className="empty-state-icon">🏆</div>
              <div>No scores yet.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
