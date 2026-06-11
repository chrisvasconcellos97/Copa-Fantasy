import React from 'react'

export default function TeamCard({ team, selected, taken, takenBy, onClick, disabled }) {
  const handleClick = () => {
    if (!taken && !disabled && onClick) onClick(team)
  }

  const potClass = team.pot ? `pot-${team.pot}` : 'badge-navy'

  return (
    <div
      className={`team-card${selected ? ' selected' : ''}${taken ? ' taken' : ''}${disabled && !taken ? ' disabled' : ''}`}
      onClick={handleClick}
      role="button"
      tabIndex={taken || disabled ? -1 : 0}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
    >
      {team.logo_url ? (
        <img src={team.logo_url} alt={team.name} />
      ) : (
        <div style={{ width: '2.5rem', height: '2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>
          ⚽
        </div>
      )}
      <span className="team-name">{team.name}</span>
      {team.pot && (
        <span className={`badge ${potClass}`} style={{ fontSize: '0.5625rem' }}>
          Pot {team.pot}
        </span>
      )}
      {taken && takenBy && (
        <span className="taken-by">picked by {takenBy}</span>
      )}
      {selected && (
        <div style={{
          position: 'absolute',
          top: '0.25rem',
          right: '0.25rem',
          width: '0.75rem',
          height: '0.75rem',
          borderRadius: '50%',
          background: 'var(--gold)',
        }} />
      )}
    </div>
  )
}
