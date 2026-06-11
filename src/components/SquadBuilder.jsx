import React from 'react';

export default function SquadBuilder({ picks, teams, myPlayerId }) {
  const myPicks = picks.filter((p) => p.game_player_id === myPlayerId);
  const pickedTeamIds = myPicks.map((p) => p.team_api_id);
  const myTeams = pickedTeamIds
    .map((id) => teams.find((t) => t.api_id === id))
    .filter(Boolean);

  const totalSlots = 8;
  const filled = myTeams.length;
  const progressPct = Math.round((filled / totalSlots) * 100);

  return (
    <div className="squad-builder">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-muted">My Teams</span>
        <span className="text-sm font-semibold">
          <span className="text-gold">{filled}</span>
          <span className="text-muted"> / {totalSlots}</span>
        </span>
      </div>
      <div className="progress-bar">
        <div className="progress-bar-fill" style={{ width: `${progressPct}%` }} />
      </div>
      <div className="squad-teams-grid mt-2">
        {Array.from({ length: totalSlots }).map((_, i) => {
          const team = myTeams[i];
          if (team) {
            return (
              <div key={team.api_id} className="squad-team-item squad-team-item--mine">
                {team.logo_url ? (
                  <img
                    className="squad-team-item__logo"
                    src={team.logo_url}
                    alt={team.name}
                    loading="lazy"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                ) : (
                  <span style={{ fontSize: '1.2rem' }}>🏳️</span>
                )}
                <span className="squad-team-item__name">{team.name}</span>
              </div>
            );
          }
          return (
            <div key={`empty-${i}`} className="squad-team-item" style={{ opacity: 0.3 }}>
              <div style={{ width: 36, height: 36, border: '2px dashed var(--border)', borderRadius: 4 }} />
              <span className="squad-team-item__name">—</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
