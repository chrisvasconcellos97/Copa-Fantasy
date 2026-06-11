import React, { useRef, useEffect } from 'react';

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
      {players.map((player, idx) => {
        const isActive = idx === currentPickerIndex;
        const isMe = player.id === myPlayerId;
        let cls = 'snake-bar__item';
        if (isActive) cls += ' snake-bar__item--active';
        if (isMe && !isActive) cls += ' snake-bar__item--me';

        return (
          <div
            key={player.id}
            className={cls}
            ref={isActive ? activeRef : null}
          >
            <div className="snake-bar__avatar" style={isActive ? { background: 'var(--gold)', color: '#000' } : isMe ? { background: 'rgba(61,220,132,0.2)', color: 'var(--success)' } : {}}>
              {player.name ? player.name[0].toUpperCase() : '?'}
            </div>
            <span className="truncate" style={{ maxWidth: 56 }}>{player.name}</span>
            {isActive && <span style={{ fontSize: '0.6rem', color: 'var(--gold)' }}>▲ NOW</span>}
          </div>
        );
      })}
    </div>
  );
}
