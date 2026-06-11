import React from 'react';

/**
 * SquadBuilder – shows my 8 drafted teams in 2 rows of 4.
 *
 * Props:
 *   picks      Array<{team_api_id, game_player_id}>
 *   teams      Array<team objects>
 *   myPlayerId string
 */
export default function SquadBuilder({ picks = [], teams = [], myPlayerId }) {
  const myPicks = picks.filter((p) => p.game_player_id === myPlayerId);
  const myTeams = myPicks
    .map((p) => teams.find((t) => t.api_id === p.team_api_id))
    .filter(Boolean);

  const slots = Array.from({ length: 8 }, (_, i) => myTeams[i] || null);
  const pct = Math.round((myTeams.length / 8) * 100);

  return (
    <div className="squad-builder">
      <div className="squad-builder__header">
        <span className="squad-builder__title">My Squad</span>
        <span className="squad-builder__count">{myTeams.length} / 8 teams</span>
      </div>

      <div className="progress-bar" style={{ marginBottom: '0.75rem' }}>
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>

      <div className="squad-builder__grid">
        {slots.map((team, i) => (
          <div key={i} className={`squad-slot${team ? ' squad-slot--filled' : ''}`}>
            {team ? (
              <>
                {team.logo_url ? (
                  <img src={team.logo_url} alt={team.name} className="squad-slot__logo" />
                ) : (
                  <div className="squad-slot__initial">{team.name?.[0] || '?'}</div>
                )}
                <span className="squad-slot__name">{team.name}</span>
              </>
            ) : (
              <div className="squad-slot__empty">
                <span className="squad-slot__empty-icon">?</span>
              </div>
            )}
          </div>
        ))}
      </div>

      <style>{`
        .squad-builder {
          background: var(--card-bg);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 1rem;
        }
        .squad-builder__header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.6rem;
        }
        .squad-builder__title {
          font-weight: 700;
          font-size: 0.9rem;
          color: var(--gold);
        }
        .squad-builder__count {
          font-size: 0.8rem;
          color: var(--text-muted);
        }
        .squad-builder__grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0.5rem;
        }
        @media (max-width: 480px) {
          .squad-builder__grid { grid-template-columns: repeat(4, 1fr); }
        }
        .squad-slot {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.25rem;
          padding: 0.4rem 0.2rem;
          border-radius: var(--radius-sm);
          background: #0e0e16;
          border: 1px solid var(--border);
          min-height: 72px;
          justify-content: center;
        }
        .squad-slot--filled {
          border-color: rgba(255,215,0,0.3);
        }
        .squad-slot__logo {
          width: 36px;
          height: 36px;
          object-fit: contain;
        }
        .squad-slot__initial {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: var(--border);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          color: var(--text-muted);
          font-size: 1rem;
        }
        .squad-slot__name {
          font-size: 0.6rem;
          text-align: center;
          color: var(--text-muted);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 100%;
          padding: 0 2px;
        }
        .squad-slot__empty {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: 2px dashed var(--border);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .squad-slot__empty-icon {
          color: var(--text-dim);
          font-size: 0.8rem;
        }
      `}</style>
    </div>
  );
}
