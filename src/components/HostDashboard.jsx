import React from 'react';

export default function HostDashboard({ players, picks, currentPickerIndex, onPoke, teams }) {
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="section-title" style={{ marginBottom: 12 }}>
        🎮 Host Dashboard
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {players.map((player, index) => {
          const playerPicks = picks.filter((p) => p.game_player_id === player.id);
          const isCurrentPicker = index === currentPickerIndex;

          return (
            <div
              key={player.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 12px',
                borderRadius: 'var(--radius-sm)',
                background: isCurrentPicker ? 'rgba(255,215,0,0.08)' : 'rgba(42,42,58,0.3)',
                border: `1px solid ${isCurrentPicker ? 'var(--gold)' : 'var(--border)'}`,
              }}
            >
              {/* Indicator */}
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: isCurrentPicker ? 'var(--gold)' : 'var(--border)',
                  flexShrink: 0,
                  animation: isCurrentPicker ? 'goldPulse 2s ease-in-out infinite' : 'none',
                }}
              />

              {/* Player name */}
              <span
                style={{
                  flex: 1,
                  fontWeight: isCurrentPicker ? 700 : 500,
                  color: isCurrentPicker ? 'var(--gold)' : 'var(--text)',
                  fontSize: '0.9rem',
                }}
              >
                {player.player_name}
              </span>

              {/* Pick count */}
              <span
                style={{
                  fontSize: '0.8rem',
                  color: 'var(--text-muted)',
                  background: 'var(--border)',
                  borderRadius: 100,
                  padding: '2px 8px',
                }}
              >
                {playerPicks.length}/8 teams
              </span>

              {/* Poke button (only for current picker) */}
              {isCurrentPicker && onPoke && (
                <button
                  className="btn btn-sm"
                  onClick={() => onPoke(player)}
                  style={{
                    background: 'rgba(255,215,0,0.15)',
                    color: 'var(--gold)',
                    border: '1px solid var(--gold)',
                    padding: '4px 10px',
                    fontSize: '0.78rem',
                  }}
                >
                  👋 Poke
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Total picks progress */}
      <div style={{ marginTop: 12 }}>
        <div className="flex items-center justify-between mb-4">
          <span className="text-muted text-sm">Draft progress</span>
          <span className="text-muted text-sm">
            {picks.length} / {players.length * 8} picks
          </span>
        </div>
        <div className="progress-bar">
          <div
            className="progress-bar-fill"
            style={{
              width: players.length > 0
                ? `${Math.round((picks.length / (players.length * 8)) * 100)}%`
                : '0%',
            }}
          />
        </div>
      </div>
    </div>
  );
}
