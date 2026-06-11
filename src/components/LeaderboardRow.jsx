import { useState } from 'react';

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
  const [overrideVal, setOverrideVal] = useState('');
  const [overrideNote, setOverrideNote] = useState('');

  const rankClass = rank <= 3 ? `rank-${rank}` : '';
  const playerName = player?.player_name || player?.game_players?.player_name || 'Unknown';
  const totalPoints = score?.total_points ?? 0;

  const myTeamPicks = picks.filter(
    (p) => String(p.game_player_id) === String(player?.id || score?.game_player_id)
  );

  const myPlayerPicks = playerPicks.filter(
    (p) => String(p.game_player_id) === String(player?.id || score?.game_player_id)
  );

  function getTeam(apiId) {
    return teams.find((t) => String(t.api_id) === String(apiId));
  }

  function getPlayer(apiId) {
    return players.find((p) => String(p.api_id) === String(apiId));
  }

  function handleOverride(e) {
    e.preventDefault();
    if (onOverride) {
      onOverride({
        gamePlayerId: player?.id || score?.game_player_id,
        points: Number(overrideVal),
        note: overrideNote,
      });
      setOverrideVal('');
      setOverrideNote('');
    }
  }

  const breakdown = score?.breakdown || {};

  return (
    <div className="leaderboard-row">
      <div className="leaderboard-row-header" onClick={onToggle}>
        <div className={`rank-badge ${rankClass}`}>{rank}</div>
        <div style={{ flex: 1 }}>
          <div className="font-semibold">{playerName}</div>
          {myTeamPicks.length > 0 && (
            <div className="text-xs text-muted mt-1">
              {myTeamPicks
                .map((p) => getTeam(p.team_api_id)?.name || `Team`)
                .join(' · ')}
            </div>
          )}
        </div>
        <div className="leaderboard-score">{totalPoints} pts</div>
        <span className="text-muted text-sm" style={{ marginLeft: 8 }}>
          {isExpanded ? '▲' : '▼'}
        </span>
      </div>

      {isExpanded && (
        <div className="leaderboard-expanded">
          {/* Teams */}
          {myTeamPicks.length > 0 && (
            <div className="mb-4">
              <div className="text-xs text-muted font-semibold mb-2 text-uppercase" style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Teams
              </div>
              <div className="flex wrap gap-2">
                {myTeamPicks.map((pick) => {
                  const team = getTeam(pick.team_api_id);
                  const fb = `https://ui-avatars.com/api/?name=${encodeURIComponent(team?.name || 'T')}&background=2a2a3a&color=e8e8f0&size=24`;
                  return (
                    <div
                      key={pick.id}
                      className="flex items-center gap-1 text-sm"
                      style={{
                        background: 'var(--card-bg)',
                        border: '1px solid var(--border)',
                        borderRadius: 6,
                        padding: '0.25rem 0.5rem',
                      }}
                    >
                      {team?.logo_url && (
                        <img
                          src={team.logo_url || fb}
                          alt={team.name}
                          style={{ width: 18, height: 18, objectFit: 'contain' }}
                          onError={(e) => { e.target.src = fb; }}
                        />
                      )}
                      <span>{team?.name || `Team ${pick.team_api_id}`}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Players */}
          {myPlayerPicks.length > 0 && (
            <div className="mb-4">
              <div className="text-xs text-muted font-semibold mb-2" style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Players
              </div>
              <div className="flex wrap gap-2">
                {myPlayerPicks.map((pick) => {
                  const pl = getPlayer(pick.player_api_id);
                  const isCaptain = String(pick.player_api_id) === String(captainPickId);
                  return (
                    <div
                      key={pick.id}
                      className="flex items-center gap-1 text-sm"
                      style={{
                        background: isCaptain ? 'rgba(255,215,0,0.08)' : 'var(--card-bg)',
                        border: `1px solid ${isCaptain ? 'var(--gold)' : 'var(--border)'}`,
                        borderRadius: 6,
                        padding: '0.25rem 0.5rem',
                      }}
                    >
                      {isCaptain && <span>👑</span>}
                      <span>{pl?.name || `Player ${pick.player_api_id}`}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Breakdown */}
          {Object.keys(breakdown).length > 0 && (
            <div className="mb-4">
              <div className="text-xs text-muted font-semibold mb-2" style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Score Breakdown
              </div>
              {Object.entries(breakdown).map(([key, val]) => (
                <div key={key} className="flex justify-between text-sm py-1" style={{ borderBottom: '1px solid var(--border)' }}>
                  <span className="text-muted">{key}</span>
                  <span className="text-gold font-semibold">+{val}</span>
                </div>
              ))}
            </div>
          )}

          {/* Host override */}
          {isHost && (
            <form onSubmit={handleOverride} className="mt-3">
              <div className="text-xs text-muted font-semibold mb-2" style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Manual Override
              </div>
              <div className="flex gap-2">
                <input
                  type="number"
                  className="input input-sm"
                  placeholder="Points"
                  value={overrideVal}
                  onChange={(e) => setOverrideVal(e.target.value)}
                  style={{ width: 90 }}
                />
                <input
                  type="text"
                  className="input input-sm"
                  placeholder="Note (optional)"
                  value={overrideNote}
                  onChange={(e) => setOverrideNote(e.target.value)}
                  style={{ flex: 1 }}
                />
                <button type="submit" className="btn btn-gold btn-sm" disabled={!overrideVal}>
                  Apply
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
