import React from 'react';

export default function HostDashboard({ players = [], picks = [], currentPicker, onPoke, teams = [] }) {
  const teamMap = Object.fromEntries(teams.map((t) => [t.api_id, t]));

  return (
    <div className="host-dash">
      <div className="section-title">Draft Progress ({picks.length} picks made)</div>
      {players.map((player) => {
        const myPicks = picks.filter((p) => p.player_id === player.id);
        const isCurrent = currentPicker?.id === player.id;

        return (
          <div key={player.id} className={`host-dash__player${isCurrent ? ' host-dash__player--current' : ''}`}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                {player.name}
                {isCurrent && <span className="badge badge-live" style={{ marginLeft: 8 }}>PICKING</span>}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 4 }}>
                {myPicks.length} team{myPicks.length !== 1 ? 's' : ''}
                {myPicks.length > 0 && ': '}
                {myPicks.map((p) => {
                  const t = teamMap[p.team_api_id];
                  return t ? t.name : p.team_api_id;
                }).join(', ')}
              </div>
            </div>
            {isCurrent && onPoke && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => onPoke(player)}
                title="Poke this player"
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
