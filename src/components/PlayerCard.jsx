import React from 'react';
import { normalizePosition } from '../lib/constants';

function posClass(pos) {
  const p = normalizePosition(pos);
  if (p === 'GK') return 'pos-GK';
  if (p === 'DEF') return 'pos-DEF';
  if (p === 'MID') return 'pos-MID';
  if (p === 'FWD') return 'pos-FWD';
  return 'pos-default';
}

export default function PlayerCard({ player, selected, onClick, showPosition = true }) {
  const handleClick = () => { if (onClick) onClick(player); };
  const pos = normalizePosition(player.position);

  return (
    <div
      className={`player-card${selected ? ' selected' : ''}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick(); }}
    >
      <div className="player-photo-wrap">
        {player.photo_url ? (
          <img
            src={player.photo_url}
            alt={player.name}
            className="player-photo"
            onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
          />
        ) : null}
        <div className="player-photo-fallback" style={{ display: player.photo_url ? 'none' : 'flex' }}>👤</div>
        {player.number && <span className="player-number-badge">#{player.number}</span>}
      </div>
      <span className="player-name">{player.name}</span>
      {showPosition && pos && (
        <span className={`position-badge ${posClass(player.position)}`}>{pos}</span>
      )}
    </div>
  );
}
