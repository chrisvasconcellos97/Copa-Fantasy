import React from 'react';
import { normalizePosition } from '../lib/constants.js';

export default function PlayerCard({ player, selected, onClick, showPosition = true }) {
  const pos = normalizePosition(player.position);

  return (
    <div
      className={`player-card${selected ? ' selected' : ''}`}
      onClick={() => onClick && onClick(player)}
    >
      {player.photo_url ? (
        <img src={player.photo_url} alt={player.name} className="player-photo" />
      ) : (
        <div className="player-photo-placeholder">
          {player.name ? player.name[0].toUpperCase() : '?'}
        </div>
      )}
      <span style={{ fontSize: '0.78rem', fontWeight: 600, textAlign: 'center', lineHeight: 1.3 }}>
        {player.name}
      </span>
      {player.number && (
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>#{player.number}</span>
      )}
      {showPosition && (
        <span className={`position-badge pos-${pos}`}>{pos}</span>
      )}
    </div>
  );
}
