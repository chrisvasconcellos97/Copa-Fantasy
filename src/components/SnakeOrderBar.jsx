import React, { useEffect, useRef } from 'react';

export default function SnakeOrderBar({ players, currentPickerIndex, myPlayerId }) {
  const activeRef = useRef(null);

  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [currentPickerIndex]);

  if (!players || players.length === 0) return null;

  return (
    <div className="snake-bar">
      {players.map((player, index) => {
        const isCurrent = index === currentPickerIndex;
        const isMe = player.id === myPlayerId;
        const classes = [
          'snake-chip',
          isCurrent ? 'current' : '',
          !isCurrent && isMe ? 'mine' : '',
        ].filter(Boolean).join(' ');

        return (
          <div
            key={player.id}
            className={classes}
            ref={isCurrent ? activeRef : null}
          >
            {isMe ? '★ ' : ''}{player.player_name}
            {isCurrent && ' ●'}
          </div>
        );
      })}
    </div>
  );
}
