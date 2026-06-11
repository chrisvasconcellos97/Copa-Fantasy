export default function HostDashboard({ players, picks, currentPickerIndex, onPoke, teams }) {
  if (!players) return null;

  const teamMap = {};
  if (teams) teams.forEach((t) => { teamMap[t.api_id] = t; });

  return (
    <div className="host-dashboard">
      <div className="section-header">
        <span className="section-title">🎮 Host Dashboard</span>
        <span className="badge badge-gold">Host</span>
      </div>
      {players.map((player, i) => {
        const playerPicks = picks
          ? picks.filter((p) => p.game_player_id === player.id)
          : [];
        const isCurrent = i === currentPickerIndex;
        return (
          <div key={player.id} className="host-player-row">
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: isCurrent ? 'var(--gold)' : 'var(--border)',
                flexShrink: 0,
              }}
            />
            <span style={{ flex: 1, fontWeight: isCurrent ? 700 : 400 }}>
              {player.player_name}
              {player.is_host && (
                <span className="badge badge-muted" style={{ marginLeft: '0.4rem', fontSize: '0.65rem' }}>
                  host
                </span>
              )}
            </span>
            <span className="label text-gold" style={{ marginRight: '0.5rem' }}>
              {playerPicks.length}/8
            </span>
            {isCurrent && onPoke && (
              <button
                className="btn btn-sm btn-secondary"
                onClick={() => onPoke(player)}
                title="Poke player"
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
