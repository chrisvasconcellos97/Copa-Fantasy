import React from 'react';

export default function HostDashboard({ players, picks, currentPickerIndex, onPoke, teams }) {
  return (
    <div className="host-dashboard">
      <div className="card-title">🎮 Host Dashboard</div>
      {players.map((player, idx) => {
        const playerPicks = picks.filter((p) => p.game_player_id === player.id);
        const isCurrent = idx === currentPickerIndex;
        return (
          <div key={player.id} className="host-player-row">
            <div style={{ flex: 1 }}>
              <div className="row gap-8">
                {isCurrent && <span>👉</span>}
                <span className={`font-600${isCurrent ? ' text-gold' : ''}`}>{player.player_name}</span>
                {player.is_host && <span className="badge badge-gold" style={{ fontSize: '0.65rem' }}>HOST</span>}
              </div>
              <div className="text-sm text-muted mt-4">
                {playerPicks.length} team{playerPicks.length !== 1 ? 's' : ''} picked
              </div>
            </div>
            {isCurrent && onPoke && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => onPoke(player.id, player.player_name)}
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
