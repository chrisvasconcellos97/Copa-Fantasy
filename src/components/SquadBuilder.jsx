import React from 'react';

export default function SquadBuilder({ picks, teams, myPlayerId }) {
  const myPicks = picks.filter((p) => p.game_player_id === myPlayerId);
  const total = 8;
  const count = myPicks.length;

  const teamMap = {};
  if (teams) {
    teams.forEach((t) => { teamMap[t.api_id] = t; });
  }

  const slots = Array.from({ length: total }, (_, i) => myPicks[i] || null);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span className="text-sm font-bold">My Teams</span>
        <span className="text-sm text-muted">{count}/{total}</span>
      </div>
      <div className="progress-bar" style={{ marginBottom: 14 }}>
        <div className="progress-fill" style={{ width: `${(count / total) * 100}%` }} />
      </div>
      <div className="squad-grid">
        {slots.map((pick, i) => {
          if (!pick) {
            return (
              <div key={i} className="squad-slot">
                <span style={{ fontSize: '1.2rem' }}>?</span>
                <span>Slot {i + 1}</span>
              </div>
            );
          }
          const team = teamMap[pick.team_api_id];
          return (
            <div key={i} className="squad-slot filled" style={{ padding: 8, gap: 6 }}>
              {team?.logo_url ? (
                <img
                  src={team.logo_url}
                  alt={team.name}
                  style={{ width: 32, height: 32, objectFit: 'contain' }}
                />
              ) : (
                <span style={{ fontSize: '1.2rem' }}>⚽</span>
              )}
              <span style={{ fontSize: '0.68rem', fontWeight: 600, textAlign: 'center', lineHeight: 1.2 }}>
                {team ? team.name : pick.team_api_id}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
