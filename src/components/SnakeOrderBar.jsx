import React from 'react';

/**
 * SnakeOrderBar – horizontal strip of player name chips showing draft order.
 *
 * Props:
 *   players            Array<{id, player_name}>
 *   currentPickerIndex number  – index into players array of current picker
 *   myPlayerId         string
 */
export default function SnakeOrderBar({ players = [], currentPickerIndex = 0, myPlayerId }) {
  return (
    <div className="snake-bar">
      <span className="snake-bar__label">Pick Order</span>
      <div className="snake-bar__chips">
        {players.map((player, idx) => {
          const isCurrent = idx === currentPickerIndex;
          const isMe = player.id === myPlayerId;
          return (
            <div
              key={player.id}
              className={`snake-chip${isCurrent ? ' snake-chip--current' : ''}${isMe ? ' snake-chip--me' : ''}`}
            >
              {isCurrent && <span className="snake-chip__dot" />}
              <span className="snake-chip__name">
                {player.player_name}
                {isMe ? ' (You)' : ''}
              </span>
            </div>
          );
        })}
      </div>

      <style>{`
        .snake-bar {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background: var(--card-bg);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 0.6rem 1rem;
          overflow-x: auto;
        }
        .snake-bar__label {
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--text-muted);
          white-space: nowrap;
          flex-shrink: 0;
        }
        .snake-bar__chips {
          display: flex;
          gap: 0.4rem;
          flex-wrap: nowrap;
          overflow-x: auto;
          padding-bottom: 2px;
        }
        .snake-chip {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.25rem 0.65rem;
          border-radius: 999px;
          font-size: 0.78rem;
          font-weight: 600;
          background: var(--dark-bg);
          border: 1.5px solid var(--border);
          color: var(--text-muted);
          white-space: nowrap;
          transition: all 0.18s ease;
        }
        .snake-chip--me {
          border-color: var(--gold);
          color: var(--gold);
        }
        .snake-chip--current {
          border-color: var(--gold);
          background: rgba(255,215,0,0.12);
          color: var(--gold);
          animation: pulse-gold 2s ease-in-out infinite;
        }
        .snake-chip__dot {
          width: 6px;
          height: 6px;
          background: var(--gold);
          border-radius: 50%;
          flex-shrink: 0;
        }
      `}</style>
    </div>
  );
}
