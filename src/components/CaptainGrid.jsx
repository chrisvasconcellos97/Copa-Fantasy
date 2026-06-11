import React from 'react';
import { normalizePosition } from '../lib/constants.js';

export default function CaptainGrid({ playerPicks, captainPickId, onSelectCaptain }) {
  if (!playerPicks || playerPicks.length === 0) {
    return (
      <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px 0' }}>
        No players picked yet.
      </div>
    );
  }

  return (
    <div className="captain-grid">
      {playerPicks.map((player) => {
        const isSelected = player.api_id === captainPickId;
        const pos = normalizePosition(player.position);
        return (
          <div
            key={player.api_id}
            className={`captain-card${isSelected ? ' selected' : ''}`}
            onClick={() => onSelectCaptain && onSelectCaptain(player)}
          >
            {isSelected && <div className="captain-crown">👑</div>}
            {player.photo_url ? (
              <img
                src={player.photo_url}
                alt={player.name}
                style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover' }}
              />
            ) : (
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  background: 'var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.2rem',
                }}
              >
                {player.name ? player.name[0] : '?'}
              </div>
            )}
            <span style={{ fontSize: '0.78rem', fontWeight: 600, textAlign: 'center', lineHeight: 1.2 }}>
              {player.name}
            </span>
            <span className={`position-badge pos-${pos}`}>{pos}</span>
          </div>
        );
      })}
    </div>
  );
}
