import React from 'react';

export default function TeamCard({ team, selected, taken, takenBy, onClick, disabled }) {
  const cls = [
    'team-card',
    selected ? 'team-card--selected' : '',
    taken ? 'team-card--taken' : '',
    disabled && !selected ? 'team-card--disabled' : '',
  ].filter(Boolean).join(' ');

  function handleClick() {
    if (disabled || taken) return;
    if (onClick) onClick(team);
  }

  return (
    <div className={cls} onClick={handleClick} title={team.name}>
      {team.logo_url ? (
        <img
          className="team-card__logo"
          src={team.logo_url}
          alt={team.name}
          loading="lazy"
          onError={(e) => { e.target.style.display = 'none'; }}
        />
      ) : (
        <div style={{ width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
          ⚽
        </div>
      )}
      <span className="team-card__name">{team.name}</span>
      {team.pot && (
        <span className="badge badge-muted" style={{ fontSize: '0.6rem' }}>Pot {team.pot}</span>
      )}
      {taken && takenBy && (
        <span className="team-card__taken-by">{takenBy}</span>
      )}
    </div>
  );
}
