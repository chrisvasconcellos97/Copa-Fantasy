import React from 'react';

export default function TeamCard({ team, selected, taken, takenBy, onClick, disabled }) {
  const classes = [
    'team-card',
    selected && 'team-card--selected',
    taken && 'team-card--taken',
    disabled && !taken && 'team-card--disabled',
  ].filter(Boolean).join(' ');

  function handleClick() {
    if (!disabled && !taken && onClick) {
      onClick(team);
    }
  }

  return (
    <div className={classes} onClick={handleClick} role="button" tabIndex={disabled || taken ? -1 : 0}
      onKeyDown={e => e.key === 'Enter' && handleClick()}>
      {team.logo_url ? (
        <img
          src={team.logo_url}
          alt={team.name}
          className="team-card__logo"
          onError={e => { e.target.style.display = 'none'; }}
        />
      ) : (
        <div className="team-card__logo" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
          🏳️
        </div>
      )}
      <span className="team-card__name">{team.name}</span>
      {team.pot && (
        <span className="team-card__pot">Pot {team.pot}</span>
      )}
      {taken && (
        <div className="team-card__taken-overlay">
          {takenBy || 'Taken'}
        </div>
      )}
    </div>
  );
}
