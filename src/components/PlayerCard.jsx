import React from 'react'

const POS_CLASS = { FWD: 'pos-fwd', MID: 'pos-mid', DEF: 'pos-def', GK: 'pos-gk' }

export default function PlayerCard({ player, selected, onClick, showPosition = true, disabled = false }) {
  const handleClick = () => {
    if (!disabled && onClick) onClick(player)
  }

  return (
    <div
      className={`player-card${selected ? ' selected' : ''}${disabled ? ' disabled' : ''}`}
      onClick={handleClick}
      role="button"
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
    >
      <img
        src={player.photo_url || 'https://media.api-sports.io/football/players/0.png'}
        alt={player.name}
        onError={(e) => { e.target.src = 'https://via.placeholder.com/40?text=?' }}
      />
      <div className="player-info">
        <div className="player-name">{player.name}</div>
        {showPosition && (
          <div className="player-meta">
            <span className={`badge ${POS_CLASS[player.position] || 'badge-navy'}`}>
              {player.position}
            </span>
            {player.number && (
              <span className="text-xs text-muted">#{player.number}</span>
            )}
          </div>
        )}
      </div>
      {selected && (
        <span style={{ color: 'var(--gold)', fontSize: '1rem' }}>✓</span>
      )}
    </div>
  )
}
