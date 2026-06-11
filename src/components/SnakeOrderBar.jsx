import React from 'react';

export default function SnakeOrderBar({ players, currentPickerIndex, myPlayerId }) {
  return (
    <div className="snake-order-bar">
      {players.map((player, idx) => {
        const isActive = idx === currentPickerIndex;
        const isMine = player.id === myPlayerId;
        const classes = [
          'snake-chip',
          isActive ? 'snake-chip--active' : '',
          !isActive && isMine ? 'snake-chip--mine' : '',
        ]
          .filter(Boolean)
          .join(' ');

        return (
          <div key={player.id} className={classes}>
            {isMine ? '⭐ ' : ''}
            {player.player_name}
            {isActive && ' 🎯'}
          </div>
        );
      })}
    </div>
  );
}
