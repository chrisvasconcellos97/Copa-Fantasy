import React from 'react';
import { normalizePosition } from '../lib/constants.js';

export default function CaptainGrid({ playerPicks, captainPickId, onSelectCaptain }) {
  if (!playerPicks || playerPicks.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">👤</div>
        <p>No players to choose from yet.</p>
      </div>
    );
  }

  return (
    <div className="captain-grid">
      {playerPicks.map((player) => {
        const isSelected = player.api_id === captainPickId || player.player_api_id === captainPickId;
        const pos = normalizePosition(player.position);

        return (
          <div
            key={player.api_id || player.player_api_id}
            className={`captain-card${isSelected ? ' selected' : ''}`}
            onClick={() => onSelectCaptain && onSelectCaptain(player.api_id || player.player_api_id)}
          >
            {isSelected && <span className="crown-icon">👑</span>}
            <img
              src={
                player.photo_url ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&background=2a2a3a&color=e8e8f0&size=64`
              }
              alt={player.name}
              style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover' }}
              onError={(e) => {
                e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&background=2a2a3a&color=e8e8f0&size=64`;
              }}
            />
            <span style={{ fontSize: '0.78rem', fontWeight: 600, lineHeight: 1.2, textAlign: 'center' }}>
              {player.name}
            </span>
            <span className={`position-badge pos-${pos}`}>{pos}</span>
          </div>
        );
      })}
    </div>
  );
}
