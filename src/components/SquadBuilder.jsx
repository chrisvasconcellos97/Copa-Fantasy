import React from 'react';

export default function SquadBuilder({ picks, teams, myPlayerId }) {
  const myPicks = picks.filter((p) => p.game_player_id === myPlayerId);
  const teamMap = {};
  (teams || []).forEach((t) => { teamMap[t.api_id] = t; });

  const slots = Array.from({ length: 8 }, (_, i) => myPicks[i] || null);
  const filled = myPicks.length;

  return (
    <div className="squad-builder">
      <div className="flex items-center justify-between mb-8">
        <span className="section-title">My Teams</span>
        <span className="text-muted text-sm">{filled}/8</span>
      </div>
      <div className="progress-bar mb-12">
        <div className="progress-fill" style={{ width: `${(filled / 8) * 100}%` }} />
      </div>
      <div className="squad-grid">
        {slots.map((pick, i) => {
          if (!pick) {
            return (
              <div key={i} className="squad-slot">
                <span style={{ fontSize: '1.5rem', opacity: 0.3 }}>?</span>
                <span>Round {i + 1}</span>
              </div>
            );
          }
          const team = teamMap[pick.team_api_id];
          return (
            <div key={pick.id || i} className="squad-slot filled">
              {team?.logo_url ? (
                <img src={team.logo_url} alt={team.name} />
              ) : (
                <span style={{ fontSize: '1.5rem' }}>🏳️</span>
              )}
              <span style={{ fontSize: '0.72rem', color: 'var(--text)', fontWeight: 600, textAlign: 'center' }}>
                {team?.name || 'Unknown'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
