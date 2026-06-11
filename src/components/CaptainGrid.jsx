import React, { useState } from 'react';
import { normalizePosition } from '../lib/constants';

const POSITION_COLORS = {
  GK: '#f59e0b',
  DEF: '#22c55e',
  MID: '#3b82f6',
  FWD: '#ef4444',
};

export default function CaptainGrid({ playerPicks, captainPickId, onSelectCaptain }) {
  const [hoverId, setHoverId] = useState(null);

  return (
    <div>
      <div className="section-title" style={{ marginBottom: 12 }}>Select Your Captain</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 10 }}>
        {playerPicks.map(player => {
          const isSelected = player.api_id === captainPickId;
          const isHovered = player.api_id === hoverId;
          const pos = normalizePosition(player?.position);
          const posColor = POSITION_COLORS[pos] || '#8888aa';
          return (
            <div
              key={player.api_id}
              onClick={() => onSelectCaptain && onSelectCaptain(player)}
              onMouseEnter={() => setHoverId(player.api_id)}
              onMouseLeave={() => setHoverId(null)}
              style={{
                background: 'var(--card-bg)',
                border: `2px solid ${isSelected ? 'var(--gold)' : isHovered ? 'var(--gold)' : 'var(--border)'}`,
                borderRadius: 'var(--radius)',
                padding: '10px 8px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 5,
                position: 'relative',
                boxShadow: isSelected ? 'var(--shadow-gold)' : 'none',
                transition: 'border-color 0.18s, box-shadow 0.18s',
              }}
            >
              {(isSelected || isHovered) && (
                <div style={{ position: 'absolute', top: 4, left: 4, fontSize: 14 }}>👑</div>
              )}
              {player.photo_url ? (
                <img
                  src={player.photo_url}
                  alt={player.name}
                  style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${isSelected ? 'var(--gold)' : 'var(--border)'}` }}
                  onError={e => { e.target.style.display = 'none'; }}
                />
              ) : (
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>👤</div>
              )}
              <span style={{ fontSize: 11, fontWeight: 600, textAlign: 'center', lineHeight: 1.3 }}>{player.name}</span>
              <span style={{ background: posColor + '22', color: posColor, borderRadius: 999, padding: '1px 7px', fontSize: 9, fontWeight: 700 }}>
                {pos}
              </span>
              {isSelected && <span style={{ color: 'var(--gold)', fontSize: 10, fontWeight: 800 }}>CAPTAIN</span>}
            </div>
          );
        })}
      </div>
      {playerPicks.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">👤</div>
          <div>No players selected yet.</div>
        </div>
      )}
    </div>
  );
}
