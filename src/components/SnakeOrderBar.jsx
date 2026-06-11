import React from 'react';

export default function SnakeOrderBar({ players, currentPickerIndex, myPlayerId }) {
  if (!players || !players.length) return null;

  return (
    <div className="snake-bar">
      {players.map((player, idx) => {
        const isActive = idx === currentPickerIndex;
        const isMine = player.id === myPlayerId;
        const classes = ['snake-chip', isActive ? 'active' : isMine ? 'mine' : '']
          .filter(Boolean)
          .join(' ');
        return (
          <span key={player.id} className={classes}>
            {player.player_name}
            {player.is_host ? ' ★' : ''}
            {isActive ? ' ⏳' : ''}
          </span>
        );
      })}
    </div>
  );
}
