import React from 'react';

export default function SnakeOrderBar({ players, currentPickerIndex, myPlayerId }) {
  return (
    <div className="snake-bar">
      <span className="text-xs text-muted font-600" style={{ whiteSpace: 'nowrap' }}>PICK ORDER:</span>
      {players.map((player, idx) => {
        const isCurrent = idx === currentPickerIndex;
        const isMe = player.id === myPlayerId;
        const cls = [
          'chip',
          isCurrent ? 'chip-active' : '',
          !isCurrent && isMe ? 'chip-mine' : '',
        ].filter(Boolean).join(' ');
        return (
          <div key={player.id} className={cls}>
            {isCurrent && <span>👉</span>}
            {player.player_name}
            {isMe && !isCurrent && <span className="text-xs">(you)</span>}
          </div>
        );
      })}
    </div>
  );
}
