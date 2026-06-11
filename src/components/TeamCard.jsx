import React from 'react';

/**
 * TeamCard – displays a team logo and name.
 *
 * Props:
 *   team      { api_id, name, logo_url, pot }
 *   selected  boolean – gold glow ring
 *   taken     boolean – grayscale with takenBy overlay
 *   takenBy   string  – player name who drafted this team
 *   onClick   function
 *   disabled  boolean
 */
export default function TeamCard({ team, selected, taken, takenBy, onClick, disabled }) {
  if (!team) return null;

  const handleClick = () => {
    if (!disabled && !taken && onClick) onClick(team);
  };

  return (
    <div
      className={`team-card${selected ? ' team-card--selected' : ''}${taken ? ' team-card--taken' : ''}${disabled ? ' team-card--disabled' : ''}`}
      onClick={handleClick}
      role="button"
      tabIndex={disabled || taken ? -1 : 0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick(); }}
      aria-pressed={selected}
      aria-disabled={disabled || taken}
      title={taken ? `Picked by ${takenBy}` : team.name}
    >
      <div className="team-card__logo-wrap">
        {team.logo_url ? (
          <img
            src={team.logo_url}
            alt={team.name}
            className="team-card__logo"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        ) : (
          <div className="team-card__logo-fallback">{team.name?.[0] || '?'}</div>
        )}

        {taken && (
          <div className="team-card__taken-overlay">
            <span className="team-card__taken-label">{takenBy || 'Taken'}</span>
          </div>
        )}

        {selected && !taken && (
          <div className="team-card__selected-badge">✓</div>
        )}
      </div>

      <p className="team-card__name">{team.name}</p>

      {team.pot && (
        <span className="team-card__pot">Pot {team.pot}</span>
      )}

      <style>{`
        .team-card {
          background: var(--card-bg);
          border: 1.5px solid var(--border);
          border-radius: var(--radius);
          padding: 0.6rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.4rem;
          cursor: pointer;
          transition: all 0.18s ease;
          position: relative;
          user-select: none;
          min-height: 110px;
        }
        .team-card:hover:not(.team-card--disabled):not(.team-card--taken) {
          border-color: var(--gold);
          background: var(--card-hover);
          transform: translateY(-2px);
        }
        .team-card--selected {
          border-color: var(--gold) !important;
          box-shadow: 0 0 16px rgba(255, 215, 0, 0.45);
          background: rgba(255, 215, 0, 0.06) !important;
        }
        .team-card--taken {
          cursor: default;
          opacity: 0.7;
        }
        .team-card--disabled {
          cursor: default;
          opacity: 0.55;
        }
        .team-card__logo-wrap {
          position: relative;
          width: 56px;
          height: 56px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .team-card__logo {
          width: 52px;
          height: 52px;
          object-fit: contain;
        }
        .team-card--taken .team-card__logo {
          filter: grayscale(90%) opacity(0.5);
        }
        .team-card__logo-fallback {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background: var(--border);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.4rem;
          font-weight: 700;
          color: var(--text-muted);
        }
        .team-card__taken-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
        }
        .team-card__taken-label {
          font-size: 0.55rem;
          font-weight: 700;
          color: var(--text-muted);
          text-align: center;
          max-width: 56px;
          word-break: break-word;
          line-height: 1.2;
        }
        .team-card__selected-badge {
          position: absolute;
          top: -4px;
          right: -4px;
          width: 20px;
          height: 20px;
          background: var(--gold);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.65rem;
          font-weight: 700;
          color: #0a0a0f;
        }
        .team-card__name {
          font-size: 0.72rem;
          font-weight: 600;
          text-align: center;
          color: var(--text);
          line-height: 1.2;
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .team-card__pot {
          font-size: 0.62rem;
          color: var(--text-dim);
          font-weight: 500;
        }
      `}</style>
    </div>
  );
}
