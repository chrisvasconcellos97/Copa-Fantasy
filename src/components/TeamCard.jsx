import React from 'react';

export default function TeamCard({ team, selected, taken, takenBy, onClick, disabled }) {
  const classes = [
    'team-card',
    selected ? 'team-card--selected' : '',
    taken ? 'team-card--taken' : '',
    disabled && !taken ? 'team-card--disabled' : '',
  ]
    .filter(Boolean)
    .join(' ');

  function handleClick() {
    if (!taken && !disabled && onClick) {
      onClick(team);
    }
  }

  return (
    <div className={classes} onClick={handleClick} role="button" tabIndex={taken || disabled ? -1 : 0}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}>
      {team.logo_url ? (
        <img
          className="team-card__logo"
          src={team.logo_url}
          alt={team.name}
          loading="lazy"
          onError={(e) => { e.target.style.display = 'none'; }}
        />
      ) : (
        <div style={{ width: 56, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
          🏳️
        </div>
      )}
      <span className="team-card__name">{team.name}</span>
      {team.pot && (
        <span className="badge badge-muted" style={{ fontSize: '0.65rem' }}>Pot {team.pot}</span>
      )}
      {taken && (
        <div className="team-card__taken-overlay">
          <span className="team-card__taken-label">Taken</span>
          <span className="team-card__taken-by">{takenBy || '—'}</span>
        </div>
      )}
    </div>
  );
}
