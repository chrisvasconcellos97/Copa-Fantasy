import React from 'react';
import { normalizePosition } from '../lib/constants';

export default function CaptainGrid({ playerPicks, captainPickId, onSelectCaptain }) {
  return (
    <div className="captain-grid">
      {playerPicks.map((player) => {
        const isSelected = player.api_id === captainPickId || player.player_api_id === captainPickId;
        const pos = normalizePosition(player.position);
        return (
          <div
            key={player.api_id || player.player_api_id}
            className={`captain-card ${isSelected ? 'captain-card--selected' : ''}`}
            onClick={() => onSelectCaptain && onSelectCaptain(player.api_id || player.player_api_id)}
          >
            {isSelected && <div className="captain-card__crown">👑</div>}
            {player.photo_url ? (
              <img
                src={player.photo_url}
                alt={player.name}
                className="captain-card__photo"
                onError={(e) => { e.currentTarget.src = ''; e.currentTarget.style.background = 'var(--border)'; }}
              />
            ) : (
              <div className="captain-card__photo" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>👤</div>
            )}
            <div className="captain-card__name">{player.name}</div>
            <span className={`position-badge position-badge--${pos}`}>{pos}</span>
          </div>
        );
      })}
    </div>
  );
}
