export default function SquadBuilder({ picks = [], teams = [], myPlayerId }) {
  const myPicks = picks.filter((p) => p.game_player_id === myPlayerId);
  const total = 8;
  const filled = myPicks.length;
  const pct = Math.round((filled / total) * 100);

  const slots = Array.from({ length: total }, (_, i) => myPicks[i] || null);

  function getTeam(teamApiId) {
    return teams.find((t) => String(t.api_id) === String(teamApiId)) || null;
  }

  const fallback = (name) =>
    `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'T')}&background=2a2a3a&color=e8e8f0&size=36`;

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm text-muted">My Teams</span>
        <span className="text-sm font-semibold text-gold">{filled}/{total}</span>
      </div>
      <div className="progress-bar mb-3">
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="squad-grid">
        {slots.map((pick, i) => {
          const team = pick ? getTeam(pick.team_api_id) : null;
          return (
            <div key={i} className={`squad-slot ${pick ? 'filled' : ''}`}>
              {team ? (
                <>
                  <img
                    src={team.logo_url || fallback(team.name)}
                    alt={team.name}
                    className="squad-slot-logo"
                    onError={(e) => { e.target.src = fallback(team.name); }}
                  />
                  <span className="squad-slot-name">{team.name}</span>
                </>
              ) : (
                <span style={{ fontSize: '1.2rem', color: 'var(--border)' }}>+</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
