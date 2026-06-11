import React, { useState } from 'react';

const RANK_COLORS = {
  1: 'var(--gold)',
  2: '#C0C0C0',
  3: '#CD7F32',
};

export default function LeaderboardRow({
  rank,
  player,
  score,
  picks,
  playerPicks,
  captainPickId,
  teams,
  players,
  isExpanded,
  onToggle,
  isHost,
  onOverride,
}) {
  const [overrideValue, setOverrideValue] = useState('');
  const [overrideDesc, setOverrideDesc] = useState('');

  const rankColor = RANK_COLORS[rank] || 'var(--text-muted)';
  const totalPoints = score?.total_points ?? 0;

  // Get my drafted teams
  const myTeamIds = (picks || [])
    .filter((p) => p.game_player_id === player.id)
    .map((p) => p.team_api_id);
  const myTeams = myTeamIds.map((id) => teams?.find((t) => t.api_id === id)).filter(Boolean);

  // Get captain player
  const captainPlayer = captainPickId
    ? players?.find((p) => p.api_id === captainPickId)
    : null;

  // Breakdown from score
  const breakdown = score?.breakdown || {};

  function handleOverride(e) {
    e.stopPropagation();
    if (onOverride && overrideValue !== '') {
      onOverride(player.id, parseFloat(overrideValue), overrideDesc);
      setOverrideValue('');
      setOverrideDesc('');
    }
  }

  return (
    <div
      style={{
        background: 'var(--card-bg)',
        border: `1px solid ${rank <= 3 ? rankColor + '44' : 'var(--border)'}`,
        borderRadius: 'var(--radius)',
        overflow: 'hidden',
        transition: 'all 0.2s ease',
      }}
    >
      {/* Collapsed row */}
      <div
        onClick={onToggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '14px 16px',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        {/* Rank */}
        <span
          style={{
            minWidth: 28,
            fontWeight: 800,
            fontSize: '1.1rem',
            color: rankColor,
            textAlign: 'center',
          }}
        >
          {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`}
        </span>

        {/* Name */}
        <span style={{ flex: 1, fontWeight: 600, fontSize: '0.95rem' }}>
          {player.player_name}
          {player.is_host && (
            <span className="badge badge-gold" style={{ marginLeft: 8, fontSize: '0.65rem' }}>
              HOST
            </span>
          )}
        </span>

        {/* Teams count */}
        <span className="text-muted text-sm" style={{ marginRight: 4 }}>
          {myTeams.length}/8 🏳️
        </span>

        {/* Points */}
        <span
          style={{
            fontWeight: 800,
            fontSize: '1.2rem',
            color: rank <= 3 ? rankColor : 'var(--text)',
            minWidth: 50,
            textAlign: 'right',
          }}
        >
          {totalPoints}
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500 }}> pts</span>
        </span>

        {/* Expand toggle */}
        <span
          style={{
            color: 'var(--text-muted)',
            fontSize: '0.8rem',
            marginLeft: 4,
            transition: 'transform 0.2s',
            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)',
          }}
        >
          ▾
        </span>
      </div>

      {/* Expanded panel */}
      {isExpanded && (
        <div
          style={{
            borderTop: '1px solid var(--border)',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          {/* Teams */}
          {myTeams.length > 0 && (
            <div>
              <div className="text-muted text-xs" style={{ marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Draft Teams
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {myTeams.map((team) => (
                  <div
                    key={team.api_id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '4px 10px',
                      borderRadius: 100,
                      background: 'rgba(42,42,58,0.5)',
                      border: '1px solid var(--border)',
                      fontSize: '0.8rem',
                    }}
                  >
                    {team.logo_url && (
                      <img
                        src={team.logo_url}
                        alt=""
                        style={{ width: 16, height: 16, objectFit: 'contain' }}
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    )}
                    {team.name}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Captain */}
          {captainPlayer && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Captain:
              </span>
              <span style={{ fontWeight: 600, color: 'var(--gold)', fontSize: '0.9rem' }}>
                👑 {captainPlayer.name}
              </span>
            </div>
          )}

          {/* Score breakdown */}
          {Object.keys(breakdown).length > 0 && (
            <div>
              <div className="text-muted text-xs" style={{ marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Points Breakdown
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {Object.entries(breakdown).map(([key, val]) => (
                  <div key={key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                    <span style={{ color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                      {key.replace(/_/g, ' ')}
                    </span>
                    <span style={{ fontWeight: 600, color: val >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                      {val >= 0 ? '+' : ''}{val}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Host override */}
          {isHost && onOverride && (
            <div
              style={{
                borderTop: '1px solid var(--border)',
                paddingTop: 12,
                display: 'flex',
                gap: 8,
                flexWrap: 'wrap',
              }}
            >
              <input
                type="number"
                className="input"
                placeholder="Points"
                value={overrideValue}
                onChange={(e) => setOverrideValue(e.target.value)}
                style={{ width: 90, flexShrink: 0 }}
                onClick={(e) => e.stopPropagation()}
              />
              <input
                type="text"
                className="input"
                placeholder="Reason (optional)"
                value={overrideDesc}
                onChange={(e) => setOverrideDesc(e.target.value)}
                style={{ flex: 1, minWidth: 120 }}
                onClick={(e) => e.stopPropagation()}
              />
              <button
                className="btn btn-sm"
                style={{
                  background: 'rgba(255,215,0,0.15)',
                  color: 'var(--gold)',
                  border: '1px solid var(--gold)',
                }}
                onClick={handleOverride}
              >
                Apply
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
