import React from 'react';
import PlayerCard from './PlayerCard';

export default function CaptainGrid({ playerPicks, captainPickId, onSelectCaptain }) {
  return (
    <div className="captain-grid">
      {playerPicks.map((player) => {
        const isCaptain = player.api_id === captainPickId;
        return (
          <div key={player.api_id} className="captain-player-card" onClick={() => onSelectCaptain && onSelectCaptain(player)}>
            {isCaptain && <div className="crown-badge">👑</div>}
            <PlayerCard
              player={player}
              selected={isCaptain}
              showPosition={true}
            />
          </div>
        );
      })}
      {playerPicks.length === 0 && (
        <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
          <div className="empty-state-icon">👤</div>
          <p>No players selected yet</p>
        </div>
      )}
    </div>
  );
}
