import React from 'react';

export default function CaptainGrid({ playerPicks, captainPickId, onSelectCaptain }) {
  if (!playerPicks || playerPicks.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state__icon">👤</div>
        <div className="empty-state__title">No players selected yet</div>
      </div>
    );
  }

  return (
    <div className="captain-grid">
      {playerPicks.map((player) => {
        const isSelected = player.api_id === captainPickId || player.player_api_id === captainPickId;
        return (
          <div
            key={player.api_id || player.player_api_id}
            className={`captain-card${isSelected ? ' captain-card--selected' : ''}`}
            onClick={() => onSelectCaptain && onSelectCaptain(player.api_id || player.player_api_id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) =>
              e.key === 'Enter' && onSelectCaptain && onSelectCaptain(player.api_id || player.player_api_id)
            }
          >
            {isSelected && <span className="captain-card__crown">👑</span>}
            {player.photo_url ? (
              <img
                className="captain-card__photo"
                src={player.photo_url}
                alt={player.name}
                loading="lazy"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            ) : (
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  background: 'var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.4rem',
                }}
              >
                👤
              </div>
            )}
            <span className="captain-card__name">{player.name}</span>
            {player.position && (
              <span className="badge badge-muted" style={{ fontSize: '0.65rem' }}>
                {player.position}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
