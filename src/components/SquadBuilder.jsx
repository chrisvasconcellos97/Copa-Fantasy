import React from 'react';

export default function SquadBuilder({ picks, teams, myPlayerId }) {
  const myPicks = picks.filter((p) => p.game_player_id === myPlayerId);
  const pickedTeamIds = myPicks.map((p) => p.team_api_id);
  const pickedTeams = pickedTeamIds.map((id) => teams.find((t) => t.api_id === id)).filter(Boolean);

  const totalSlots = 8;
  const filled = pickedTeams.length;
  const pct = Math.round((filled / totalSlots) * 100);

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="flex items-center justify-between mb-8">
        <span className="section-title" style={{ margin: 0 }}>My Squad</span>
        <span className="text-muted text-sm">
          {filled}/{totalSlots} teams
        </span>
      </div>

      {/* Progress bar */}
      <div className="progress-bar mb-12">
        <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
      </div>

      {/* Team grid: 2 rows of 4 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 8,
        }}
      >
        {Array.from({ length: totalSlots }).map((_, i) => {
          const team = pickedTeams[i];
          return (
            <div
              key={i}
              style={{
                background: team ? 'var(--card-bg)' : 'rgba(42,42,58,0.3)',
                border: `1px solid ${team ? 'var(--border-hover)' : 'var(--border)'}`,
                borderRadius: 'var(--radius-sm)',
                padding: '8px 4px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                minHeight: 64,
                justifyContent: 'center',
              }}
            >
              {team ? (
                <>
                  {team.logo_url ? (
                    <img
                      src={team.logo_url}
                      alt={team.name}
                      style={{ width: 28, height: 28, objectFit: 'contain' }}
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  ) : (
                    <span style={{ fontSize: '1rem' }}>⚽</span>
                  )}
                  <span
                    style={{
                      fontSize: '0.65rem',
                      fontWeight: 600,
                      color: 'var(--text)',
                      textAlign: 'center',
                      lineHeight: 1.2,
                    }}
                  >
                    {team.name}
                  </span>
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
