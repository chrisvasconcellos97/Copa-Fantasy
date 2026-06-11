import React from 'react';

export default function CaptainGrid({ playerPicks, captainPickId, onSelectCaptain, players, teams, draftPicks }) {
  // playerPicks: array of player_picks rows
  // players: map of player_api_id -> player
  // teams: map of team_api_id -> team
  // draftPicks: array of draft_picks (to find team for each player_pick)

  return (
    <div className="captain-grid">
      {(playerPicks || []).map((pp) => {
        const player = players ? players[pp.player_api_id] : null;
        const draftPick = draftPicks ? draftPicks.find((dp) => dp.id === pp.draft_pick_id) : null;
        const team = teams && draftPick ? teams[draftPick.team_api_id] : null;
        const isSelected = pp.id === captainPickId;

        return (
          <div
            key={pp.id}
            className={`captain-card ${isSelected ? 'captain-card--selected' : ''}`}
            onClick={() => onSelectCaptain && onSelectCaptain(pp.id)}
          >
            {isSelected && <div className="captain-crown">👑</div>}
            {player?.photo_url ? (
              <img
                className="captain-card__photo"
                src={player.photo_url}
                alt={player?.name || ''}
                loading="lazy"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            ) : (
              <div className="captain-card__photo" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', background: 'var(--navy-2)' }}>
                👤
              </div>
            )}
            <div className="captain-card__name">{player?.name || '—'}</div>
            <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
              <span className={`badge badge-${(pp.position || 'mid').toLowerCase()}`}>{pp.position}</span>
            </div>
            {team && (
              <div className="captain-card__team">{team.name}</div>
            )}
            {isSelected && (
              <span className="badge badge-gold" style={{ marginTop: '0.25rem' }}>Captain ×2</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
