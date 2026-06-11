import React from 'react';
import { normalizePosition } from '../lib/constants';

/**
 * PlayerCard – circular photo, name, position badge, number.
 *
 * Props:
 *   player       { api_id, name, position, number, photo_url }
 *   selected     boolean – gold ring
 *   onClick      function
 *   showPosition boolean
 */
export default function PlayerCard({ player, selected, onClick, showPosition = true }) {
  if (!player) return null;

  const pos = normalizePosition(player.position);

  const posColor = {
    GK: '#f59e0b',
    DEF: '#3b82f6',
    MID: '#22c55e',
    FWD: '#ef4444',
  }[pos] || '#8888aa';

  return (
    <div
      className={`player-card${selected ? ' player-card--selected' : ''}`}
      onClick={() => onClick && onClick(player)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick && onClick(player); }}
      aria-pressed={selected}
    >
      <div className="player-card__photo-wrap" style={selected ? { boxShadow: `0 0 0 3px var(--gold), 0 0 16px rgba(255,215,0,0.4)` } : {}}>
        {player.photo_url ? (
          <img
            src={player.photo_url}
            alt={player.name}
            className="player-card__photo"
            onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
          />
        ) : null}
        <div className="player-card__photo-fallback" style={player.photo_url ? { display: 'none' } : {}}>
          {player.name?.[0] || '?'}
        </div>
        {player.number != null && (
          <span className="player-card__number">#{player.number}</span>
        )}
      </div>

      <p className="player-card__name">{player.name}</p>

      {showPosition && (
        <span className="player-card__pos" style={{ background: `${posColor}22`, color: posColor }}>
          {pos}
        </span>
      )}

      <style>{`
        .player-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.35rem;
          padding: 0.6rem 0.4rem;
          background: var(--card-bg);
          border: 1.5px solid var(--border);
          border-radius: var(--radius);
          cursor: pointer;
          transition: all 0.18s ease;
          user-select: none;
        }
        .player-card:hover {
          border-color: var(--gold);
          background: var(--card-hover);
          transform: translateY(-2px);
        }
        .player-card--selected {
          border-color: var(--gold);
          background: rgba(255,215,0,0.05);
        }
        .player-card__photo-wrap {
          position: relative;
          width: 60px;
          height: 60px;
          border-radius: 50%;
          overflow: visible;
          flex-shrink: 0;
        }
        .player-card__photo {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid var(--border);
        }
        .player-card__photo-fallback {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: var(--border);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.3rem;
          font-weight: 700;
          color: var(--text-muted);
          border: 2px solid var(--border-light);
        }
        .player-card__number {
          position: absolute;
          bottom: -4px;
          right: -4px;
          background: var(--card-bg);
          border: 1px solid var(--border);
          border-radius: 999px;
          font-size: 0.6rem;
          font-weight: 700;
          color: var(--text-muted);
          padding: 1px 4px;
          white-space: nowrap;
        }
        .player-card__name {
          font-size: 0.7rem;
          font-weight: 600;
          text-align: center;
          color: var(--text);
          line-height: 1.2;
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          width: 100%;
        }
        .player-card__pos {
          font-size: 0.62rem;
          font-weight: 700;
          padding: 0.1rem 0.4rem;
          border-radius: 999px;
          letter-spacing: 0.04em;
        }
      `}</style>
    </div>
  );
}
