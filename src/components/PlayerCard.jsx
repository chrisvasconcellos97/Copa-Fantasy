import React from 'react';
import { normalizePosition } from '../lib/constants.js';

export default function PlayerCard({ player, selected, onClick, showPosition = true }) {
  const pos = normalizePosition(player.position);
  const posClass = `pos-${pos}`;

  return (
    <div
      className={`player-card${selected ? ' selected' : ''}`}
      onClick={() => onClick && onClick(player)}
    >
      <img
        className="player-photo"
        src={player.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&background=2a2a3a&color=e8e8f0&size=64`}
        alt={player.name}
        onError={(e) => {
          e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&background=2a2a3a&color=e8e8f0&size=64`;
        }}
      />
      {player.number && (
        <span className="player-number">#{player.number}</span>
      )}
      <span className="player-name">{player.name}</span>
      {showPosition && (
        <span className={`position-badge ${posClass}`}>{pos}</span>
      )}
    </div>
  );
}
