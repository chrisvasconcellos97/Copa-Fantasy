import React from 'react';

export default function HostDashboard({ players, picks, currentPickerIndex, onPoke, teams }) {
  const teamMap = {};
  if (teams) teams.forEach(t => { teamMap[t.api_id] = t; });

  return (
    <div style={{
      background: 'var(--card-bg)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      padding: 16,
      marginBottom: 16,
    }}>
      <div className="section-title">Host Dashboard</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {players.map((player, idx) => {
          const playerPicks = picks.filter(p => p.game_player_id === player.id);
          const isCurrent = idx === currentPickerIndex;
          return (
            <div
              key={player.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 12px',
                background: isCurrent ? 'rgba(255,215,0,0.07)' : '#0d0d14',
                border: `1px solid ${isCurrent ? 'var(--gold)' : 'var(--border)'}`,
                borderRadius: 8,
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: isCurrent ? 'var(--gold)' : 'var(--text)' }}>
                  {player.player_name || player.name}
                  {isCurrent && <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--gold)' }}>● Picking</span>}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  {playerPicks.length} team{playerPicks.length !== 1 ? 's' : ''} picked
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                {playerPicks.slice(0, 4).map(pick => {
                  const team = teamMap[pick.team_api_id];
                  return team?.logo_url ? (
                    <img key={pick.id} src={team.logo_url} alt={team.name} title={team.name} style={{ width: 20, height: 20, objectFit: 'contain' }} />
                  ) : (
                    <span key={pick.id} style={{ fontSize: 12 }}>⚽</span>
                  );
                })}
              </div>
              {isCurrent && onPoke && (
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => onPoke(player)}
                  style={{ fontSize: 11 }}
                >
                  👈 Poke
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
