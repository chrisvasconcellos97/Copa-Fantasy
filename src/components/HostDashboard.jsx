import React from 'react';

/**
 * HostDashboard – host-only panel showing each player's pick count and poke button.
 *
 * Props:
 *   players            Array<{id, player_name}>
 *   picks              Array<{game_player_id}>
 *   currentPickerIndex number
 *   onPoke             function(playerId)
 *   teams              Array<team objects>
 */
export default function HostDashboard({ players = [], picks = [], currentPickerIndex = 0, onPoke, teams = [] }) {
  return (
    <div className="host-dashboard">
      <p className="host-dashboard__title">🎛️ Host Dashboard</p>

      <div className="host-dashboard__list">
        {players.map((player, idx) => {
          const playerPicks = picks.filter((p) => p.game_player_id === player.id);
          const isCurrent = idx === currentPickerIndex;

          return (
            <div key={player.id} className={`hd-row${isCurrent ? ' hd-row--current' : ''}`}>
              <div className="hd-row__info">
                {isCurrent && <span className="hd-row__arrow">▶</span>}
                <span className="hd-row__name">{player.player_name}</span>
                <span className="hd-row__count">{playerPicks.length} picks</span>
              </div>

              <div className="hd-row__teams">
                {playerPicks.map((pick) => {
                  const team = teams.find((t) => t.api_id === pick.team_api_id);
                  return team ? (
                    <img
                      key={pick.id}
                      src={team.logo_url}
                      alt={team.name}
                      className="hd-team-logo"
                      title={team.name}
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  ) : null;
                })}
              </div>

              {isCurrent && onPoke && (
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => onPoke(player.id)}
                  title={`Poke ${player.player_name}`}
                >
                  👋 Poke
                </button>
              )}
            </div>
          );
        })}
      </div>

      <style>{`
        .host-dashboard {
          background: var(--card-bg);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 1rem;
        }
        .host-dashboard__title {
          font-weight: 700;
          font-size: 0.88rem;
          margin-bottom: 0.75rem;
          color: var(--text-muted);
        }
        .host-dashboard__list { display: flex; flex-direction: column; gap: 0.4rem; }
        .hd-row {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.5rem 0.6rem;
          border-radius: var(--radius-sm);
          background: #0e0e16;
          border: 1px solid var(--border);
          flex-wrap: wrap;
        }
        .hd-row--current {
          border-color: var(--gold);
          background: rgba(255,215,0,0.04);
        }
        .hd-row__info {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          min-width: 120px;
        }
        .hd-row__arrow { color: var(--gold); font-size: 0.75rem; }
        .hd-row__name { font-weight: 600; font-size: 0.85rem; }
        .hd-row__count { font-size: 0.75rem; color: var(--text-muted); }
        .hd-row__teams {
          display: flex;
          gap: 0.25rem;
          flex-wrap: wrap;
          flex: 1;
        }
        .hd-team-logo {
          width: 22px;
          height: 22px;
          object-fit: contain;
        }
      `}</style>
    </div>
  );
}
