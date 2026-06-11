import React from 'react';
import { normalizePosition } from '../lib/constants';

/**
 * CaptainGrid – grid of picked players; click to set captain.
 *
 * Props:
 *   playerPicks      Array of player objects
 *   captainPickId    string – currently selected captain player_api_id
 *   onSelectCaptain  function(player)
 */
export default function CaptainGrid({ playerPicks = [], captainPickId, onSelectCaptain }) {
  if (playerPicks.length === 0) {
    return (
      <div className="empty-state">
        <p>No players picked yet.</p>
      </div>
    );
  }

  return (
    <div className="captain-grid">
      {playerPicks.map((player) => {
        const isCaptain = player.api_id === captainPickId;
        const pos = normalizePosition(player.position);

        return (
          <div
            key={player.api_id}
            className={`cap-card${isCaptain ? ' cap-card--captain' : ''}`}
            onClick={() => onSelectCaptain && onSelectCaptain(player)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelectCaptain && onSelectCaptain(player); }}
          >
            <div className="cap-card__crown-wrap">
              {isCaptain && <span className="cap-card__crown">👑</span>}
              <div className="cap-card__photo-wrap">
                {player.photo_url ? (
                  <img src={player.photo_url} alt={player.name} className="cap-card__photo" onError={(e) => { e.target.style.display='none'; }} />
                ) : (
                  <div className="cap-card__fallback">{player.name?.[0] || '?'}</div>
                )}
              </div>
            </div>
            <p className="cap-card__name">{player.name}</p>
            <span className="cap-card__pos">{pos}</span>
            {isCaptain && <span className="cap-card__label">Captain</span>}
          </div>
        );
      })}

      <style>{`
        .captain-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
          gap: 0.75rem;
        }
        .cap-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.35rem;
          padding: 0.75rem 0.5rem;
          background: var(--card-bg);
          border: 1.5px solid var(--border);
          border-radius: var(--radius);
          cursor: pointer;
          transition: all 0.18s ease;
          position: relative;
          user-select: none;
        }
        .cap-card:hover {
          border-color: var(--gold);
          background: var(--card-hover);
          transform: translateY(-2px);
        }
        .cap-card--captain {
          border-color: var(--gold);
          background: rgba(255,215,0,0.07);
          box-shadow: 0 0 16px rgba(255,215,0,0.3);
        }
        .cap-card__crown-wrap { position: relative; }
        .cap-card__crown {
          position: absolute;
          top: -22px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 1.2rem;
          z-index: 1;
        }
        .cap-card__photo-wrap {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          overflow: hidden;
          border: 2px solid var(--border);
        }
        .cap-card--captain .cap-card__photo-wrap {
          border-color: var(--gold);
          box-shadow: 0 0 10px rgba(255,215,0,0.4);
        }
        .cap-card__photo {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .cap-card__fallback {
          width: 100%;
          height: 100%;
          background: var(--border);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.3rem;
          font-weight: 700;
          color: var(--text-muted);
        }
        .cap-card__name {
          font-size: 0.72rem;
          font-weight: 600;
          text-align: center;
          color: var(--text);
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          width: 100%;
        }
        .cap-card__pos {
          font-size: 0.65rem;
          color: var(--text-muted);
          font-weight: 600;
        }
        .cap-card__label {
          font-size: 0.65rem;
          font-weight: 700;
          color: var(--gold);
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }
      `}</style>
    </div>
  );
}
