import React from 'react';

export default function SnakeOrderBar({ players, currentPickerIndex, myPlayerId }) {
  return (
    <div className="snake-bar">
      {(players || []).map((player, idx) => {
        const isActive = idx === currentPickerIndex;
        const isMe = player.id === myPlayerId;
        const cls = [
          'snake-bar__item',
          isActive ? 'snake-bar__item--active' : '',
          isMe && !isActive ? 'snake-bar__item--me' : '',
        ].filter(Boolean).join(' ');

        return (
          <div key={player.id} className={cls}>
            <span className="snake-bar__name" style={{ color: isActive ? 'var(--gold-soft)' : isMe ? 'var(--success)' : 'var(--text)' }}>
              {player.name}
              {isMe ? ' (you)' : ''}
            </span>
            {isActive && (
              <span className="snake-bar__pick" style={{ color: 'var(--gold)' }}>Picking…</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
