import React from 'react';

export default function TeamCard({ team, selected, taken, takenBy, onClick, disabled }) {
  let cls = 'team-card';
  if (selected) cls += ' team-card--selected';
  if (taken) cls += ' team-card--taken';
  if (disabled && !taken) cls += ' team-card--disabled';

  return (
    <div className={cls} onClick={!disabled && !taken ? onClick : undefined} title={takenBy ? `Taken by ${takenBy}` : team.name}>
      {team.logo_url ? (
        <img src={team.logo_url} alt={team.name} onError={(e) => { e.target.style.display = 'none'; }} />
      ) : (
        <div style={{ width: 44, height: 44, background: 'var(--navy-3)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
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
