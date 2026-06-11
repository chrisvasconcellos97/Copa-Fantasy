import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useScores } from '../hooks/useScores';
import { usePlayers } from '../hooks/usePlayers';
import { useDraft } from '../hooks/useDraft';
import { supabase } from '../lib/supabase';
import LeaderboardRow from '../components/LeaderboardRow';
import { RESULT_TYPES, SCORING } from '../lib/constants';
import { TEAM_POINTS, PLAYER_POINTS } from '../lib/scoring';

export default function LeaderboardView() {
  const { gameId } = useParams();
  const { scores, loading: scoresLoading } = useScores(gameId);
  const { players, loading: playersLoading } = usePlayers(gameId);
  const { picks: draftPicks } = useDraft(gameId);

  const myPlayerId = localStorage.getItem('copa_player_id');
  const hostToken = localStorage.getItem('copa_host_token');
  const [game, setGame] = useState(null);
  const isHost = game && hostToken && game.host_token === hostToken;

  const [expandedRow, setExpandedRow] = useState(null);
  const [teams, setTeams] = useState([]);
  const [playerPicks, setPlayerPicks] = useState([]);
  const [captainPicks, setCaptainPicks] = useState([]);
  const [dbPlayers, setDbPlayers] = useState([]);

  // Host controls
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [selectedResultType, setSelectedResultType] = useState('group_win');
  const [bonusPlayerId, setBonusPlayerId] = useState('');
  const [bonusPoints, setBonusPoints] = useState('');
  const [bonusDesc, setBonusDesc] = useState('');
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    if (!gameId) return;
    supabase.from('games').select('*').eq('id', gameId).single().then(({ data }) => setGame(data));
    supabase.from('teams').select('*').then(({ data }) => setTeams(data || []));
    supabase.from('player_picks').select('*').eq('game_id', gameId).then(({ data }) => setPlayerPicks(data || []));
    supabase.from('captain_picks').select('*').eq('game_id', gameId).then(({ data }) => setCaptainPicks(data || []));
    supabase.from('players').select('*').then(({ data }) => setDbPlayers(data || []));
  }, [gameId]);

  const teamsById = {};
  teams.forEach((t) => { teamsById[t.api_id] = t; });

  const playersById = {};
  dbPlayers.forEach((p) => { playersById[p.api_id] = p; });

  // Build score entries with player info
  const scoreEntries = scores.map((sc) => {
    const player = players.find((p) => p.id === sc.game_player_id);
    const myDraftPicks = draftPicks.filter((dp) => dp.game_player_id === sc.game_player_id);
    const myPlayerPicks = playerPicks.filter((pp) => pp.game_player_id === sc.game_player_id);
    const captainPick = captainPicks.find((cp) => cp.game_player_id === sc.game_player_id);
    return { sc, player, myDraftPicks, myPlayerPicks, captainPickId: captainPick?.player_api_id };
  });

  async function applyTeamResult() {
    if (!selectedTeamId || !selectedResultType) return;
    setSaving(true);
    setStatusMsg('');
    try {
      const pts = TEAM_POINTS[selectedResultType] || 0;
      // Find all players who have this team
      const pickersWithTeam = draftPicks
        .filter((dp) => dp.team_api_id === selectedTeamId)
        .map((dp) => dp.game_player_id);
      const uniquePlayers = [...new Set(pickersWithTeam)];

      for (const playerId of uniquePlayers) {
        const existing = scores.find((s) => s.game_player_id === playerId);
        if (existing) {
          const breakdown = existing.breakdown || {};
          const teamPoints = (breakdown.team_points || 0) + pts;
          const totalPoints = (existing.total_points || 0) + pts;
          await supabase.from('user_scores').update({
            total_points: totalPoints,
            breakdown: { ...breakdown, team_points: teamPoints },
            updated_at: new Date().toISOString(),
          }).eq('id', existing.id);
        } else {
          await supabase.from('user_scores').insert({
            game_id: gameId,
            game_player_id: playerId,
            total_points: pts,
            breakdown: { team_points: pts, player_points: 0 },
          });
        }
      }
      setStatusMsg(`✅ +${pts} pts for ${uniquePlayers.length} player(s)`);
    } catch (e) {
      setStatusMsg('Error: ' + e.message);
    }
    setSaving(false);
  }

  async function applyBonus() {
    if (!bonusPlayerId || !bonusPoints) return;
    setSaving(true);
    setStatusMsg('');
    try {
      const pts = parseInt(bonusPoints, 10);
      const existing = scores.find((s) => s.game_player_id === bonusPlayerId);
      if (existing) {
        const breakdown = existing.breakdown || {};
        await supabase.from('user_scores').update({
          total_points: (existing.total_points || 0) + pts,
          breakdown: { ...breakdown, override: (breakdown.override || 0) + pts },
          updated_at: new Date().toISOString(),
        }).eq('id', existing.id);
      } else {
        await supabase.from('user_scores').insert({
          game_id: gameId,
          game_player_id: bonusPlayerId,
          total_points: pts,
          breakdown: { team_points: 0, player_points: 0, override: pts },
        });
      }
      setStatusMsg(`✅ ${pts > 0 ? '+' : ''}${pts} pts applied`);
      setBonusPoints('');
      setBonusDesc('');
    } catch (e) {
      setStatusMsg('Error: ' + e.message);
    }
    setSaving(false);
  }

  async function handleOverride(playerId, pts, reason) {
    const existing = scores.find((s) => s.game_player_id === playerId);
    if (existing) {
      const breakdown = existing.breakdown || {};
      await supabase.from('user_scores').update({
        total_points: (existing.total_points || 0) + pts,
        breakdown: { ...breakdown, override: (breakdown.override || 0) + pts },
        updated_at: new Date().toISOString(),
      }).eq('id', existing.id);
    }
  }

  if (scoresLoading || playersLoading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p>Loading leaderboard…</p>
      </div>
    );
  }

  return (
    <div className="view">
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--gold)' }}>Leaderboard</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Copa Fantasy 2026</p>
      </div>

      {scoreEntries.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize: '2rem', marginBottom: 8 }}>📊</div>
          <p>No scores yet.</p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: 6 }}>
            Scores will appear once the tournament begins.
          </p>
          {/* Show players even without scores */}
          {players.map((p, i) => (
            <div key={p.id} style={{
              display: 'flex', justifyContent: 'space-between', padding: '10px 14px',
              background: 'var(--card-bg)', borderRadius: 'var(--radius-sm)',
              margin: '4px 0', border: '1px solid var(--border)',
            }}>
              <span style={{ fontWeight: 600 }}>#{i + 1} {p.player_name || p.name}</span>
              <span style={{ color: 'var(--text-muted)' }}>0 pts</span>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ marginBottom: 20 }}>
          {scoreEntries.map((entry, i) => (
            <LeaderboardRow
              key={entry.sc.id}
              rank={i + 1}
              player={entry.player}
              score={entry.sc}
              picks={entry.myDraftPicks}
              playerPicks={entry.myPlayerPicks}
              captainPickId={entry.captainPickId}
              teams={teams}
              players={dbPlayers}
              isExpanded={expandedRow === entry.sc.game_player_id}
              onToggle={() => setExpandedRow(
                expandedRow === entry.sc.game_player_id ? null : entry.sc.game_player_id
              )}
              isHost={isHost}
              onOverride={handleOverride}
            />
          ))}
        </div>
      )}

      {isHost && (
        <div className="card">
          <div className="card-title">Host Controls</div>

          {statusMsg && (
            <div style={{
              padding: '8px 12px', borderRadius: 6, marginBottom: 12,
              background: statusMsg.startsWith('✅') ? 'rgba(56,161,105,0.1)' : 'rgba(229,62,62,0.1)',
              color: statusMsg.startsWith('✅') ? 'var(--success)' : 'var(--danger)',
              fontSize: '0.85rem',
            }}>
              {statusMsg}
            </div>
          )}

          {/* Add Team Result */}
          <div style={{ marginBottom: 16 }}>
            <div className="input-label" style={{ marginBottom: 8 }}>Award Team Points</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <select
                className="input"
                value={selectedTeamId}
                onChange={(e) => setSelectedTeamId(e.target.value)}
              >
                <option value="">Select team…</option>
                {teams.map((t) => (
                  <option key={t.api_id} value={t.api_id}>{t.name}</option>
                ))}
              </select>
              <select
                className="input"
                value={selectedResultType}
                onChange={(e) => setSelectedResultType(e.target.value)}
              >
                {Object.entries(TEAM_POINTS).map(([key, pts]) => (
                  <option key={key} value={key}>{key} (+{pts} pts)</option>
                ))}
              </select>
              <button className="btn-gold" onClick={applyTeamResult} disabled={saving || !selectedTeamId}>
                {saving ? 'Saving…' : 'Apply Team Result'}
              </button>
            </div>
          </div>

          {/* Add Player Bonus */}
          <div>
            <div className="input-label" style={{ marginBottom: 8 }}>Add Player Bonus</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <select
                className="input"
                value={bonusPlayerId}
                onChange={(e) => setBonusPlayerId(e.target.value)}
              >
                <option value="">Select player…</option>
                {players.map((p) => (
                  <option key={p.id} value={p.id}>{p.player_name || p.name}</option>
                ))}
              </select>
              <input
                className="input"
                type="number"
                placeholder="Points (positive or negative)"
                value={bonusPoints}
                onChange={(e) => setBonusPoints(e.target.value)}
              />
              <input
                className="input"
                type="text"
                placeholder="Description (optional)"
                value={bonusDesc}
                onChange={(e) => setBonusDesc(e.target.value)}
              />
              <button className="btn-gold" onClick={applyBonus} disabled={saving || !bonusPlayerId || !bonusPoints}>
                {saving ? 'Saving…' : 'Apply Bonus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
