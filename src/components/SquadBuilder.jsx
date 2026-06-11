import React from 'react';

export default function SquadBuilder({ picks, teams, myPlayerId }) {
  const myPicks = picks.filter((p) => p.game_player_id === myPlayerId);
  const myTeams = myPicks.map((p) => {
    return teams.find((t) => t.api_id === p.team_api_id) || { name: 'Unknown', api_id: p.team_api_id };
  });

  const slots = Array.from({ length: 8 }, (_, i) => myTeams[i] || null);
  const count = myTeams.length;
  const pct = (count / 8) * 100;

  return (
    <div className="squad-builder">
      <div className="row-between">
        <span className="text-sm font-600 text-muted">MY SQUAD</span>
        <span className="text-sm font-bold text-gold">{count}/8 teams</span>
      </div>
      <div className="progress-bar-wrap">
        <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="squad-grid">
        {slots.map((team, i) => (
          <div key={i} className={`squad-slot${team ? ' filled' : ''}`}>
            {team ? (
              <>
                {team.logo_url ? (
                  <img src={team.logo_url} alt={team.name} className="squad-slot-logo"
                    onError={(e) => { e.target.style.display = 'none'; }} />
                ) : (
                  <span style={{ fontSize: '1.5rem' }}>⚽</span>
                )}
                <span className="squad-slot-name">{team.name}</span>
              </>
            ) : (
              <span className="squad-slot-empty">?</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
