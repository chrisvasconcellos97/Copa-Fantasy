export default function SquadBuilder({ picks, teams, myPlayerId }) {
  const myPicks = picks
    ? picks.filter((p) => p.game_player_id === myPlayerId)
    : [];

  const teamMap = {};
  if (teams) {
    teams.forEach((t) => { teamMap[t.api_id] = t; });
  }

  const slots = Array.from({ length: 8 }, (_, i) => myPicks[i] || null);
  const filled = myPicks.length;

  return (
    <div className="squad-builder">
      <div className="flex items-center justify-between" style={{ marginBottom: '0.75rem' }}>
        <span className="label">My Teams</span>
        <span className="label text-gold">{filled}/8</span>
      </div>
      <div className="progress-bar" style={{ marginBottom: '0.75rem' }}>
        <div className="progress-fill" style={{ width: `${(filled / 8) * 100}%` }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
        {slots.map((pick, i) => {
          const team = pick ? teamMap[pick.team_api_id] : null;
          return (
            <div key={i} className={`squad-slot${team ? ' squad-slot--filled' : ''}`}>
              {team ? (
                <>
                  {team.logo_url ? (
                    <img className="squad-slot__logo" src={team.logo_url} alt={team.name} />
                  ) : (
                    <div style={{ fontSize: '1.2rem' }}>🏴</div>
                  )}
                  <span className="squad-slot__name">{team.name}</span>
                </>
              ) : (
                <span style={{ fontSize: '0.7rem', color: 'var(--text-dark)' }}>Slot {i + 1}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
