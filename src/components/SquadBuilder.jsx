import React from 'react';

const POSITIONS = ['FWD', 'MID', 'DEF'];

export default function SquadBuilder({ picks, teams, playerPicksByDraftPickId, allPlayers }) {
  // picks = draft_picks for a game_player
  // teams = map from api_id → team object
  // playerPicksByDraftPickId = { draft_pick_id: [player_pick, ...] }
  // allPlayers = map from api_id → player object

  if (!picks || picks.length === 0) {
    return (
      <div className="empty-state" style={{ padding: 24 }}>
        <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>No teams drafted yet</span>
      </div>
    );
  }

  return (
    <div className="squad-builder">
      {picks.map((pick) => {
        const team = teams && (teams[pick.team_api_id] || null);
        const playerPicks = (playerPicksByDraftPickId && playerPicksByDraftPickId[pick.id]) || [];
        const byPosition = {};
        playerPicks.forEach((pp) => { byPosition[pp.position] = pp; });

        return (
          <div key={pick.id} className="squad-team">
            <div className="squad-team__header">
              {team?.logo_url && (
                <img src={team.logo_url} alt={team.name} onError={(e) => { e.target.style.display = 'none'; }} />
              )}
              <span className="truncate">{team?.name || `Team ${pick.team_api_id}`}</span>
              {pick.pot && <span className="badge badge-muted" style={{ marginLeft: 'auto', fontSize: '0.6rem' }}>P{pick.pot}</span>}
            </div>
            {POSITIONS.map((pos) => {
              const pp = byPosition[pos];
              const player = pp && allPlayers && allPlayers[pp.player_api_id];
              return (
                <div key={pos} className={`squad-team__slot${!pp ? ' squad-team__slot--empty' : ''}`}>
                  <span className="text-xs" style={{ color: 'var(--muted)', minWidth: 28 }}>{pos}</span>
                  {player ? (
                    <span className="truncate" style={{ fontSize: '0.78rem' }}>{player.name}</span>
                  ) : pp ? (
                    <span className="truncate text-muted" style={{ fontSize: '0.78rem' }}>Player #{pp.player_api_id}</span>
                  ) : (
                    <span style={{ color: 'var(--line)' }}>—</span>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
