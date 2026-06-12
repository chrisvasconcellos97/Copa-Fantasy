import React from 'react';
import { normalizePosition } from '../lib/constants';

const POS_COLORS = {
  GK: { bg: 'rgba(255,215,0,0.15)', color: 'var(--gold)' },
  DEF: { bg: 'rgba(34,197,94,0.15)', color: 'var(--success)' },
  MID: { bg: 'rgba(59,130,246,0.15)', color: 'var(--info)' },
  FWD: { bg: 'rgba(239,68,68,0.15)', color: 'var(--danger)' },
};

export default function CaptainGrid({ playerPicks, captainPickId, onSelectCaptain }) {
  if (!playerPicks || playerPicks.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">👤</div>
        <p>No players selected yet.</p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-muted text-sm mb-12">
        Select your captain — they earn double points ×2
      </p>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
          gap: 12,
        }}
      >
        {playerPicks.map((player) => {
          const isCaptain = player.api_id === captainPickId || player.player_api_id === captainPickId;
          const pos = normalizePosition(player?.position);
          const posStyle = POS_COLORS[pos] || POS_COLORS.MID;

          return (
            <div
              key={player.api_id || player.player_api_id}
              onClick={() => onSelectCaptain && onSelectCaptain(player)}
              style={{
                position: 'relative',
                background: 'var(--card-bg)',
                border: `2px solid ${isCaptain ? 'var(--gold)' : 'var(--border)'}`,
                borderRadius: 'var(--radius)',
                padding: '14px 8px 10px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: isCaptain ? '0 0 20px rgba(255,215,0,0.4)' : 'none',
                userSelect: 'none',
              }}
            >
              {/* Crown badge */}
              {isCaptain && (
                <div
                  style={{
                    position: 'absolute',
                    top: -10,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    fontSize: '1.2rem',
                    lineHeight: 1,
                  }}
                >
                  👑
                </div>
              )}

              {/* Photo */}
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  border: `2px solid ${isCaptain ? 'var(--gold)' : 'var(--border)'}`,
                  overflow: 'hidden',
                  background: 'var(--dark-bg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {player?.photo_url ? (
                  <img
                    src={player.photo_url?.includes('cdn.sofifa.net') ? `https://hmasaapwbhxueuhxxqkd.supabase.co/functions/v1/img-proxy?url=${encodeURIComponent(player.photo_url)}` : player.photo_url}
                    alt={player.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                ) : (
                  <span style={{ fontSize: '1.4rem' }}>👤</span>
                )}
              </div>

              {/* Name */}
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: isCaptain ? 'var(--gold)' : 'var(--text)',
                  textAlign: 'center',
                  lineHeight: 1.2,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: '100%',
                }}
              >
                {player?.name || 'Player'}
              </span>

              {/* Position */}
              <span
                style={{
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  padding: '1px 6px',
                  borderRadius: 100,
                  background: posStyle.bg,
                  color: posStyle.color,
                }}
              >
                {pos}
              </span>

              {/* Hover crown hint */}
              {!isCaptain && (
                <div
                  className="captain-hover-hint"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: 'var(--radius)',
                    background: 'rgba(255,215,0,0.05)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'center',
                    paddingTop: 4,
                    opacity: 0,
                    transition: 'opacity 0.2s',
                    fontSize: '0.9rem',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = '0')}
                >
                  👑
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
