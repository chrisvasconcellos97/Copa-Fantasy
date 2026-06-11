import React from 'react';

const MEDALS = ['🥇', '🥈', '🥉'];

export default function LeaderboardRow({
  rank,
  player,
  score,
  picks = [],
  playerPicks = [],
  captainPickId,
  teams = [],
  players = [],
  isExpanded,
  onToggle,
  isHost,
  onOverride,
}) {
  const medal = MEDALS[rank - 1] || rank;
  const myTeams = picks.filter((p) => p.player_id === player.id);
  const myPlayerPicks = playerPicks.filter((p) => p.player_id === player.id);

  return (
    <div
      style={{
        background: 'var(--navy-2)',
        border: '1px solid var(--line)',
        borderRadius: 'var(--radius)',
        overflow: 'hidden',
        marginBottom: 8,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '14px 16px',
          cursor: 'pointer',
          gap: 12,
        }}
        onClick={onToggle}
      >
        <div style={{ fontSize: 20, minWidth: 32, textAlign: 'center' }}>{medal}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{player.name}</div>
          <div className="text-xs text-muted">{myTeams.length} teams · {myPlayerPicks.length} players</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: 800, fontSize: 20, color: 'var(--gold-soft)' }}>
            {score?.total_points ?? 0}
          </div>
          <div className="text-xs text-muted">pts</div>
        </div>
        <div style={{ color: 'var(--muted)', fontSize: 12 }}>{isExpanded ? '▲' : '▼'}</div>
      </div>

      {isExpanded && (
        <div style={{ borderTop: '1px solid var(--line)', padding: '14px 16px' }}>
          {myTeams.length > 0 && (
            <div className="mb-4">
              <div className="section-title">Teams</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {myTeams.map((pick) => {
                  const team = teams.find((t) => t.id === pick.team_id);
                  return (
                    <span key={pick.id} className="tag">
                      {team?.name || pick.team_id}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {myPlayerPicks.length > 0 && (
            <div className="mb-4">
              <div className="section-title">Players</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {myPlayerPicks.map((pick) => {
                  const isCaptain = pick.id === captainPickId;
                  return (
                    <span key={pick.id} className={`tag${isCaptain ? ' tag-green' : ''}`}>
                      {isCaptain && '👑 '}{pick.player_name || '?'} ({pick.position})
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {isHost && onOverride && (
            <div>
              <div className="divider" />
              <div className="section-title">Host Overrides</div>
              <button
                className="btn btn-ghost btn-sm mt-2"
                onClick={() => onOverride(player)}
              >
                ✏️ Edit Points
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
