import React, { useState, useEffect } from 'react';
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
  const { scores, loading: scoresLoading } = useScores(gameId);
  const { players } = usePlayers(gameId);
  const { picks } = useDraft(gameId);
  const session = getSession();
  const isHost = Boolean(session?.hostToken);

  const [teams, setTeams] = useState([]);
  const [allPlayers, setAllPlayers] = useState([]);
  const [playerPicksAll, setPlayerPicksAll] = useState([]);
  const [captainPicksAll, setCaptainPicksAll] = useState([]);
  const [expandedRow, setExpandedRow] = useState(null);

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
      const [{ data: teamsData }, { data: playersData }, { data: ppData }, { data: cpData }] = await Promise.all([
        supabase.from('teams').select('*'),
        supabase.from('players').select('*'),
        supabase.from('player_picks').select('*').eq('game_id', gameId),
        supabase.from('captain_picks').select('*').eq('game_id', gameId),
      ]);
      setTeams(teamsData || []);
      setAllPlayers(playersData || []);
      setPlayerPicksAll(ppData || []);
      setCaptainPicksAll(cpData || []);
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

  return (
    <div className="page">
      <h1 className="page-title">Leaderboard</h1>

      {scoresLoading ? (
        <div className="loading"><div className="spinner" /></div>
      ) : leaderboardEntries.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon">🏆</div>
          <div className="empty-state__text">No scores yet</div>
        </div>
      ) : (
        <div>
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
              players={allPlayers}
              isExpanded={expandedRow === player.id}
              onToggle={() => setExpandedRow(expandedRow === player.id ? null : player.id)}
              isHost={isHost}
              onOverride={isHost ? handleOverride : null}
            />
          ))}
        </div>
      )}

      {isHost && (
        <div className="card mt-24">
          <div className="section-header">Host Controls</div>

          {hostMsg && (
            <div style={{ padding: '10px 14px', background: 'var(--border)', borderRadius: 'var(--radius-sm)', marginBottom: 16, fontSize: '0.85rem', color: 'var(--success)' }}>
              {hostMsg}
            </div>
          )}

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
