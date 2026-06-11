import React from 'react';

export default function TeamCard({ team, selected, taken, takenBy, onClick, disabled }) {
  const classes = [
    'team-card',
    selected ? 'selected' : '',
    taken ? 'taken' : '',
    disabled && !taken ? 'disabled' : '',
  ].filter(Boolean).join(' ');

  function handleClick() {
    if (taken || disabled) return;
    if (onClick) onClick(team);
  }

  return (
    <div className={classes} onClick={handleClick} title={team.name}>
      <span className="pot-badge">P{team.pot || '?'}</span>
      {team.logo_url ? (
        <img
          src={team.logo_url}
          alt={team.name}
          onError={(e) => { e.target.style.display = 'none'; }}
        />
      ) : (
        <div
          style={{
            width: 52,
            height: 52,
            background: 'var(--border)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.4rem',
          }}
        >
          🏳️
        </div>
      )}
      <span className="team-name">{team.name}</span>
      {taken && takenBy && (
        <span className="taken-by">{takenBy}</span>
      )}
    </div>
  );
}
