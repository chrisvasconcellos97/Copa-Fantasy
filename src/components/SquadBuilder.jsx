import React from 'react';

export default function SquadBuilder({ picks, teams, playerPicks, players }) {
  // picks: draft_picks for this player
  // teams: map of team_api_id -> team object
  // playerPicks: player_picks for this player
  // players: map of player_api_id -> player object

  const POSITIONS = ['FWD', 'MID', 'DEF'];

  return (
    <div className="squad-builder">
      {(picks || []).map((pick) => {
        const team = (teams || {})[pick.team_api_id] || { name: pick.team_api_id, logo_url: null };
        const teamPlayerPicks = (playerPicks || []).filter(
          (pp) => pp.draft_pick_id === pick.id
        );

        return (
          <div key={pick.id} className="squad-team">
            {team.logo_url ? (
              <img className="squad-team__logo" src={team.logo_url} alt={team.name} loading="lazy" />
            ) : (
              <div className="squad-team__logo" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>⚽</div>
            )}
            <div className="squad-team__name truncate">{team.name}</div>
            {POSITIONS.map((pos) => {
              const pp = teamPlayerPicks.find((p) => p.position === pos);
              const pl = pp && players ? (players[pp.player_api_id] || null) : null;
              return (
                <div key={pos} className="squad-team__slot">
                  <span className="squad-team__slot-pos">{pos}</span>
                  <span className="squad-team__slot-name">
                    {pl ? pl.name : pp ? '...' : '–'}
                  </span>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
