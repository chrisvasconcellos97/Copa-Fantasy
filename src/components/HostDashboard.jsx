export default function HostDashboard({ players = [], picks = [], currentPickerIndex, onPoke, teams = [] }) {
  function getTeamCount(playerId) {
    return picks.filter((p) => p.game_player_id === playerId).length;
  }

  function getTeamNames(playerId) {
    const playerPicks = picks.filter((p) => p.game_player_id === playerId);
    return playerPicks.map((pick) => {
      const team = teams.find((t) => String(t.api_id) === String(pick.team_api_id));
      return team ? team.name : `Team ${pick.team_api_id}`;
    });
  }

  return (
    <div className="host-dashboard">
      <div className="section-title" style={{ fontSize: '0.9rem' }}>
        🎯 Host Dashboard
      </div>
      {players.map((player, i) => {
        const isCurrent = i === currentPickerIndex;
        const count = getTeamCount(player.id);
        const teamNames = getTeamNames(player.id);
        return (
          <div key={player.id} className="host-player-row">
            <div>
              <div className="flex items-center gap-2">
                <span
                  className="text-sm font-semibold"
                  style={{ color: isCurrent ? 'var(--gold)' : 'var(--text)' }}
                >
                  {player.player_name}
                  {isCurrent && ' ← picking'}
                </span>
                <span className="badge badge-muted">{count}/8</span>
              </div>
              {teamNames.length > 0 && (
                <div className="text-xs text-muted mt-1" style={{ maxWidth: 220 }}>
                  {teamNames.join(', ')}
                </div>
              )}
            </div>
            {isCurrent && onPoke && (
              <button
                className="btn btn-gold btn-sm"
                onClick={() => onPoke(player.id)}
                title={`Poke ${player.player_name}`}
              >
                👉 Poke
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
