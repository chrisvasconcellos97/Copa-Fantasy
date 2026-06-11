import React from 'react';
import { normalizePosition } from '../lib/constants';

const POSITION_COLORS = {
  GK: '#f59e0b',
  DEF: '#3b82f6',
  MID: '#22c55e',
  FWD: '#ef4444',
};

export default function PlayerCard({ player, selected, onClick, showPosition }) {
  const pos = normalizePosition(player.position);
  const posColor = POSITION_COLORS[pos] || '#8888aa';

  return (
    <div
      className={`player-card${selected ? ' player-card--selected' : ''}`}
      onClick={() => onClick && onClick(player)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick && onClick(player)}
    >
      {player.photo_url ? (
        <img
          className="player-card__photo"
          src={player.photo_url}
          alt={player.name}
          loading="lazy"
          onError={(e) => {
            e.target.style.display = 'none';
            e.target.nextSibling && (e.target.nextSibling.style.display = 'flex');
          }}
        />
      ) : (
        <div className="player-card__photo-placeholder">👤</div>
      )}
      <span className="player-card__name">{player.name}</span>
      {player.number && (
        <span className="player-card__number">#{player.number}</span>
      )}
      {showPosition && (
        <span
          className="badge"
          style={{
            background: `${posColor}22`,
            color: posColor,
            border: `1px solid ${posColor}44`,
          }}
        >
          {pos}
        </span>
      )}
    </div>
  );
}
