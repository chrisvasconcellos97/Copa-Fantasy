import React from 'react';

export default function SnakeOrderBar({ players, currentPickerIndex, myPlayerId }) {
  if (!players || players.length === 0) return null;

  return (
    <div
      style={{
        overflowX: 'auto',
        display: 'flex',
        gap: 8,
        padding: '12px 0',
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none',
      }}
    >
      {players.map((player, index) => {
        const isCurrentPicker = index === currentPickerIndex;
        const isMe = player.id === myPlayerId;

        return (
          <div
            key={player.id}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              borderRadius: 100,
              border: `1.5px solid ${isCurrentPicker ? 'var(--gold)' : isMe ? 'var(--gold)' : 'var(--border)'}`,
              background: isCurrentPicker
                ? 'rgba(255,215,0,0.12)'
                : isMe
                ? 'rgba(255,215,0,0.05)'
                : 'var(--card-bg)',
              color: isCurrentPicker ? 'var(--gold)' : isMe ? 'var(--gold)' : 'var(--text-muted)',
              fontSize: '0.85rem',
              fontWeight: isCurrentPicker || isMe ? 700 : 500,
              whiteSpace: 'nowrap',
              flexShrink: 0,
              animation: isCurrentPicker ? 'goldPulse 2s ease-in-out infinite' : 'none',
              transition: 'all 0.3s ease',
            }}
          >
            {isCurrentPicker && <span style={{ fontSize: '0.7rem' }}>🎯</span>}
            {isMe && !isCurrentPicker && <span style={{ fontSize: '0.7rem' }}>👤</span>}
            <span>{player.player_name}</span>
            {isCurrentPicker && (
              <span
                style={{
                  fontSize: '0.65rem',
                  background: 'var(--gold)',
                  color: '#0a0a0f',
                  borderRadius: 4,
                  padding: '1px 5px',
                  fontWeight: 700,
                }}
              >
                NOW
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
