import React from 'react';
import { normalizePosition } from '../lib/constants';

const POS_COLORS = {
  GK: { bg: 'rgba(255,215,0,0.15)', color: 'var(--gold)' },
  DEF: { bg: 'rgba(34,197,94,0.15)', color: 'var(--success)' },
  MID: { bg: 'rgba(59,130,246,0.15)', color: 'var(--info)' },
  FWD: { bg: 'rgba(239,68,68,0.15)', color: 'var(--danger)' },
};

export default function PlayerCard({ player, selected, onClick, showPosition = true }) {
  const pos = normalizePosition(player?.position);
  const posStyle = POS_COLORS[pos] || POS_COLORS.MID;
  const isTop = player?.isTop;

  return (
    <div
      onClick={() => onClick && onClick(player)}
      style={{
        background: isTop ? 'rgba(255,215,0,0.06)' : 'var(--card-bg)',
        border: `2px solid ${selected ? 'var(--gold)' : isTop ? 'rgba(255,215,0,0.4)' : 'var(--border)'}`,
        borderRadius: 'var(--radius)',
        padding: '12px 8px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '6px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
        boxShadow: selected ? '0 0 16px rgba(255,215,0,0.35)' : isTop ? '0 0 8px rgba(255,215,0,0.15)' : 'none',
        userSelect: 'none',
        position: 'relative',
      }}
    >
      {/* Top 10 star badge */}
      {isTop && (
        <div style={{
          position: 'absolute',
          top: 4,
          right: 4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 1,
        }}>
          <span style={{ fontSize: '0.75rem', lineHeight: 1 }}>⭐</span>
          {player.rating && (
            <span style={{
              fontSize: '0.6rem',
              fontWeight: 700,
              color: 'var(--gold)',
              lineHeight: 1,
            }}>{player.rating}</span>
          )}
        </div>
      )}

      {/* Photo */}
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: '50%',
          border: selected ? '2px solid var(--gold)' : '2px solid var(--border)',
          overflow: 'hidden',
          background: 'var(--dark-bg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {player?.photo_url ? (
          <img
            src={player.photo_url?.includes('cdn.sofifa.net') ? `https://hmasaapwbhxueuhxxqkd.supabase.co/functions/v1/img-proxy?url=${encodeURIComponent(player.photo_url)}` : player.photo_url}
            alt={player.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
          />
        ) : null}
        <span style={{
          display: player?.photo_url ? 'none' : 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          fontSize: '0.85rem',
          fontWeight: 800,
          color: posStyle.color,
          background: posStyle.bg,
          borderRadius: '50%',
        }}>
          {(player?.name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
        </span>
      </div>

      {/* Number badge */}
      {player?.number && (
        <span
          style={{
            position: 'absolute',
            top: 6,
            left: 6,
            fontSize: '0.65rem',
            background: 'rgba(255,255,255,0.1)',
            color: 'var(--text-muted)',
            borderRadius: 4,
            padding: '1px 5px',
            fontWeight: 600,
          }}
        >
          #{player.number}
        </span>
      )}

      {/* Name */}
      <span
        style={{
          fontSize: '0.78rem',
          fontWeight: 600,
          textAlign: 'center',
          color: selected ? 'var(--gold)' : 'var(--text)',
          lineHeight: 1.2,
          maxWidth: '100%',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {player?.name || 'Unknown'}
      </span>

      {/* Position */}
      {showPosition && (
        <span
          style={{
            fontSize: '0.7rem',
            fontWeight: 700,
            padding: '2px 7px',
            borderRadius: 100,
            background: posStyle.bg,
            color: posStyle.color,
          }}
        >
          {pos}
        </span>
      )}
    </div>
  );
}
