import React from 'react';
import { normalizePosition } from '../lib/constants';

const POSITION_COLORS = {
  GK: '#f59e0b',
  DEF: '#22c55e',
  MID: '#3b82f6',
  FWD: '#ef4444',
};

export default function PlayerCard({ player, selected, onClick, showPosition }) {
  const pos = normalizePosition(player?.position);
  const posColor = POSITION_COLORS[pos] || '#8888aa';

  return (
    <div
      onClick={() => onClick && onClick(player)}
      style={{
        background: 'var(--card-bg)',
        border: `2px solid ${selected ? 'var(--gold)' : 'var(--border)'}`,
        borderRadius: 'var(--radius)',
        padding: '12px 8px',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        boxShadow: selected ? 'var(--shadow-gold)' : 'none',
        transition: 'border-color 0.18s, box-shadow 0.18s',
        position: 'relative',
      }}
    >
      {player?.photo_url ? (
        <img
          src={player.photo_url}
          alt={player.name}
          style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${selected ? 'var(--gold)' : 'var(--border)'}` }}
          onError={e => { e.target.src = ''; e.target.style.background = 'var(--border)'; }}
        />
      ) : (
        <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, border: `2px solid ${selected ? 'var(--gold)' : 'var(--border)'}` }}>
          👤
        </div>
      )}
      <span style={{ fontSize: 12, fontWeight: 600, textAlign: 'center', lineHeight: 1.3, color: 'var(--text)' }}>
        {player?.name}
      </span>
      {showPosition && (
        <span style={{ background: posColor + '22', color: posColor, borderRadius: 999, padding: '1px 8px', fontSize: 10, fontWeight: 700 }}>
          {pos}
        </span>
      )}
      {player?.number && (
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>#{player.number}</span>
      )}
      {selected && (
        <div style={{ position: 'absolute', top: 4, right: 4, color: 'var(--gold)', fontSize: 12 }}>✓</div>
      )}
    </div>
  );
}
