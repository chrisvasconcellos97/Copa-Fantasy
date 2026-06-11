import React from 'react';

export default function CaptainGrid({ playerPicks = [], captainPickId, onSelectCaptain, players = [], teams = [] }) {
  const playerMap = Object.fromEntries(players.map((p) => [p.api_id, p]));
  const teamMap = Object.fromEntries(teams.map((t) => [t.api_id, t]));

  // playerPicks has player_api_id, draft_pick references team
  return (
    <div className="captain-grid">
      {playerPicks.map((pp) => {
        const player = playerMap[pp.player_api_id] || {};
        const isSelected = captainPickId === pp.id;

        return (
          <div
            key={pp.id}
            className={`captain-card${isSelected ? ' captain-card--selected' : ''}`}
            onClick={() => onSelectCaptain && onSelectCaptain(pp)}
          >
            {player.photo_url
              ? <img className="captain-card__photo" src={player.photo_url} alt={player.name} />
              : <div className="captain-card__photo" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>👤</div>
            }
            <div className="captain-card__name">{player.name || 'Unknown'}</div>
            <div className="captain-card__2x">2× Captain</div>
            <div className="captain-card__team">
              <span className={`badge badge-${(pp.position || 'fwd').toLowerCase()}`}>{pp.position}</span>
            </div>
          </div>
        );
      })}
      {playerPicks.length === 0 && (
        <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '24px', color: 'var(--muted)' }}>
          No players selected yet
        </div>
      )}
    </div>
  );
}
