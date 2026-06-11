import React from 'react';

export default function CaptainGrid({ playerPicks, captainPickId, onSelectCaptain, allPlayers, picks }) {
  // playerPicks = array of player_pick rows for this user
  // picks = array of draft_picks for this user (to get team name)
  // allPlayers = map api_id → player
  // captainPickId = currently selected captain player_pick_id

  if (!playerPicks || playerPicks.length === 0) {
    return (
      <div className="empty-state">
        <span className="text-muted">No players selected yet.</span>
      </div>
    );
  }

  const pickMap = {};
  if (picks) picks.forEach((p) => { pickMap[p.id] = p; });

  return (
    <div className="captain-grid">
      {playerPicks.map((pp) => {
        const player = allPlayers && allPlayers[pp.player_api_id];
        const isSelected = captainPickId === pp.id;
        const draftPick = pickMap[pp.draft_pick_id];

        return (
          <div
            key={pp.id}
            className={`captain-card${isSelected ? ' captain-card--selected' : ''}`}
            onClick={() => onSelectCaptain(pp.id)}
          >
            {isSelected && (
              <div style={{ position: 'absolute', top: 8, right: 8 }}>
                <div className="captain-badge">C</div>
              </div>
            )}
            {player?.photo_url ? (
              <img src={player.photo_url} alt={player.name} onError={(e) => { e.target.style.display = 'none'; }} />
            ) : (
              <div style={{
                width: 52, height: 52, borderRadius: '50%', background: 'var(--navy-3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem',
              }}>
                👤
              </div>
            )}
            <div style={{ fontSize: '0.8rem', fontWeight: 700, lineHeight: 1.2 }}>
              {player?.name || `Player #${pp.player_api_id}`}
            </div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
              <span className="badge badge-muted">{pp.position}</span>
              {draftPick && (
                <span className="badge badge-gold" style={{ fontSize: '0.6rem' }}>P{draftPick.pot}</span>
              )}
            </div>
            {isSelected && (
              <div style={{ fontSize: '0.7rem', color: 'var(--gold)', fontWeight: 700 }}>2× CAPTAIN</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
