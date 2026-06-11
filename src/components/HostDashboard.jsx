import React from 'react';

export default function HostDashboard({ players, picks, currentPickerIndex, onPoke, teams }) {
  const teamMap = {};
  if (teams) teams.forEach((t) => { teamMap[t.api_id] = t; });

  return (
    <div className="host-dashboard">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>
          Host Controls
        </span>
        <span className="badge badge-gold" style={{ fontSize: '0.65rem' }}>HOST</span>
      </div>
      {players.map((player, idx) => {
        const playerPicks = picks.filter((pk) => pk.game_player_id === player.id);
        const isCurrentPicker = idx === currentPickerIndex;
        return (
          <div key={player.id} className="host-player-row">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
              {isCurrentPicker && <span style={{ color: 'var(--gold)', fontSize: '0.9rem' }}>⏳</span>}
              <span style={{ fontWeight: isCurrentPicker ? 700 : 400, color: isCurrentPicker ? 'var(--gold)' : 'var(--text)', fontSize: '0.88rem' }}>
                {player.player_name}
              </span>
              {player.is_host && <span className="badge badge-gold" style={{ fontSize: '0.6rem' }}>HOST</span>}
            </div>
            <span className="text-muted text-sm">{playerPicks.length}/8 teams</span>
            {isCurrentPicker && onPoke && (
              <button
                className="btn btn-outline btn-sm"
                onClick={() => onPoke(player)}
                style={{ fontSize: '0.75rem' }}
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
