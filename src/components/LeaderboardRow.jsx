import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

/**
 * LeaderboardRow – collapsible leaderboard entry.
 *
 * Props:
 *   rank          number
 *   player        { id, player_name, is_host }
 *   score         { total_points, breakdown } | null
 *   picks         Array<{team_api_id}> – draft_picks for this player
 *   playerPicks   Array<player objects> – player_picks for this player
 *   captainPickId string – captain player_api_id
 *   teams         Array<team objects>
 *   players       Array<player objects> (squad)
 *   isExpanded    boolean
 *   onToggle      function
 *   isHost        boolean
 *   onOverride    function(gamePlayerId, newTotal)
 */
export default function LeaderboardRow({
  rank,
  player,
  score,
  picks = [],
  playerPicks = [],
  captainPickId,
  teams = [],
  players = [],
  isExpanded,
  onToggle,
  isHost,
  onOverride,
}) {
  const [overrideVal, setOverrideVal] = useState('');
  const [saving, setSaving] = useState(false);

  const rankClass = rank === 1 ? 'top1' : rank === 2 ? 'top2' : rank === 3 ? 'top3' : '';
  const totalPts = score?.total_points ?? 0;
  const breakdown = score?.breakdown || {};

  const myTeams = picks
    .map((p) => teams.find((t) => t.api_id === p.team_api_id))
    .filter(Boolean);

  const captain = players.find((p) => p.api_id === captainPickId);

  async function handleOverride() {
    const pts = parseInt(overrideVal, 10);
    if (isNaN(pts)) return;
    setSaving(true);
    if (onOverride) await onOverride(player.id, pts);
    setOverrideVal('');
    setSaving(false);
  }

  return (
    <div className="leaderboard-row">
      <div className="lb-header" onClick={onToggle}>
        <span className={`lb-rank ${rankClass}`}>
          {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`}
        </span>
        <span className="lb-name">
          {player?.player_name || 'Unknown'}
          {player?.is_host && <span className="badge badge-gold" style={{ marginLeft: '0.4rem', fontSize: '0.6rem' }}>HOST</span>}
        </span>
        {captain && (
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            👑 {captain.name}
          </span>
        )}
        <span className="lb-pts">{totalPts} pts</span>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{isExpanded ? '▲' : '▼'}</span>
      </div>

      {isExpanded && (
        <div className="lb-body animate-fade-in">
          {/* Teams */}
          {myTeams.length > 0 && (
            <div style={{ marginBottom: '0.75rem' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Teams</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {myTeams.map((team) => (
                  <div key={team.api_id} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem' }}>
                    {team.logo_url && <img src={team.logo_url} alt="" style={{ width: 20, height: 20, objectFit: 'contain' }} />}
                    <span>{team.name}</span>
                    {breakdown[team.api_id] != null && (
                      <span style={{ color: 'var(--gold)', fontWeight: 700 }}>+{breakdown[team.api_id]}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Players */}
          {playerPicks.length > 0 && (
            <div style={{ marginBottom: '0.75rem' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Players</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {playerPicks.map((pl) => (
                  <div key={pl.api_id} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', padding: '0.2rem 0.5rem', background: '#0e0e16', borderRadius: '999px', border: '1px solid var(--border)' }}>
                    {pl.api_id === captainPickId && <span>👑</span>}
                    <span>{pl.name}</span>
                    {breakdown[`player_${pl.api_id}`] != null && (
                      <span style={{ color: 'var(--gold)', fontWeight: 700 }}>+{breakdown[`player_${pl.api_id}`]}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Host override */}
          {isHost && (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border)' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Override total:</span>
              <input
                type="number"
                className="input"
                style={{ width: 90 }}
                value={overrideVal}
                onChange={(e) => setOverrideVal(e.target.value)}
                placeholder={String(totalPts)}
              />
              <button className="btn btn-secondary btn-sm" onClick={handleOverride} disabled={saving || !overrideVal}>
                {saving ? 'Saving…' : 'Set'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
