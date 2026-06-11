import React from 'react';

export default function HostDashboard({ players, picks, currentPickerIndex, onPoke, teams }) {
  return (
    <div className="host-dashboard">
      <div className="host-dashboard__title">🎛️ Host Dashboard</div>
      {players.map((player, idx) => {
        const playerPicks = picks.filter((p) => p.game_player_id === player.id);
        const isCurrentPicker = idx === currentPickerIndex;

        return (
          <div key={player.id} className="host-player-row">
            <div className="flex items-center gap-2 flex-1">
              {isCurrentPicker && (
                <span title="Current picker" style={{ fontSize: '0.9rem' }}>🎯</span>
              )}
              <span
                className="host-player-row__name"
                style={{ color: isCurrentPicker ? 'var(--gold)' : 'var(--text)' }}
              >
                {player.player_name}
                {player.is_host && (
                  <span className="badge badge-gold" style={{ marginLeft: 6, fontSize: '0.6rem' }}>HOST</span>
                )}
              </span>
            </div>
            <span className="host-player-row__picks">{playerPicks.length} picks</span>
            {isCurrentPicker && onPoke && (
              <button
                className="btn btn-sm btn-secondary"
                onClick={() => onPoke(player.id)}
                title={`Poke ${player.player_name}`}
              >
                👋 Poke
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
