import React from 'react';

export default function HostDashboard({ players, picks, currentPickerIndex, onPoke, teams }) {
  const teamMap = {};
  (teams || []).forEach((t) => { teamMap[t.api_id] = t; });

  function getPickCount(playerId) {
    return picks.filter((p) => p.game_player_id === playerId).length;
  }

  function getTeamNames(playerId) {
    return picks
      .filter((p) => p.game_player_id === playerId)
      .map((p) => teamMap[p.team_api_id]?.name || p.team_api_id)
      .join(', ');
  }

  return (
    <div className="host-dashboard">
      <div className="card-title">Host Dashboard</div>
      {(players || []).map((player, index) => {
        const isCurrent = index === currentPickerIndex;
        const count = getPickCount(player.id);
        const teamNames = getTeamNames(player.id);

        return (
          <div key={player.id} className="player-row">
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: isCurrent ? 'var(--gold)' : 'var(--border)',
                animation: isCurrent ? 'pulse 1s infinite' : 'none',
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                {player.player_name}
                {player.is_host && (
                  <span className="badge badge-gold" style={{ marginLeft: 8, fontSize: '0.65rem' }}>HOST</span>
                )}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                {count}/8 picks{teamNames ? ` — ${teamNames}` : ''}
              </div>
            </div>
            {isCurrent && onPoke && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => onPoke(player.id)}
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
