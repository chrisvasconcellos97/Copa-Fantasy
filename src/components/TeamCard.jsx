import React from 'react';

export default function TeamCard({ team, selected, taken, takenBy, onClick, disabled }) {
  const handleClick = () => {
    if (taken || disabled) return;
    if (onClick) onClick(team);
  };

  const className = [
    'team-card',
    selected ? 'selected' : '',
    taken ? 'taken' : '',
    disabled && !selected ? 'disabled' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={className} onClick={handleClick} role="button" tabIndex={taken || disabled ? -1 : 0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick(); }}>
      {team.logo_url ? (
        <img
          src={team.logo_url}
          alt={team.name}
          className="team-logo"
          onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
        />
      ) : null}
      <div className="team-logo-fallback" style={{ display: team.logo_url ? 'none' : 'flex' }}>⚽</div>
      <span className="team-name">{team.name}</span>
      {team.pot && <span className="team-pot-badge">Pot {team.pot}</span>}

      {taken && (
        <div className="taken-overlay">
          <span className="taken-label">Taken</span>
          {takenBy && <span className="taken-by">{takenBy}</span>}
        </div>
      )}
    </div>
  );
}
