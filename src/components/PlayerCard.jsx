import React from 'react';

const POS_CLASS = { FWD: 'badge-fwd', MID: 'badge-mid', DEF: 'badge-def', GK: 'badge-muted' };

export default function PlayerCard({ player, selected, onClick, showPosition = true }) {
  const cls = [
    'player-card',
    selected ? 'player-card--selected' : '',
  ].filter(Boolean).join(' ');

  const pos = player.position || 'MID';

  return (
    <div className={cls} onClick={() => onClick && onClick(player)}>
      {player.photo_url ? (
        <img
          className="player-card__photo"
          src={player.photo_url}
          alt={player.name}
          loading="lazy"
          onError={(e) => { e.target.src = ''; e.target.style.display = 'none'; }}
        />
      ) : (
        <div className="player-card__photo" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
          👤
        </div>
      )}
      <span className="player-card__name truncate">{player.name}</span>
      {showPosition && (
        <span className={`badge ${POS_CLASS[pos] || 'badge-muted'}`}>{pos}</span>
      )}
    </div>
  );
}
