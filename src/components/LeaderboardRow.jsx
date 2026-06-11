import { useState } from 'react';

export default function LeaderboardRow({
  rank,
  player,
  score,
  picks,
  playerPicks,
  captainPickId,
  teams,
  players,
  isExpanded,
  onToggle,
  isHost,
  onOverride,
}) {
  const [overrideVal, setOverrideVal] = useState('');
  const [overrideDesc, setOverrideDesc] = useState('');

  const teamMap = {};
  if (teams) teams.forEach((t) => { teamMap[t.api_id] = t; });

  const playerMap = {};
  if (players) players.forEach((p) => { playerMap[p.api_id] = p; });

  const myTeamPicks = picks
    ? picks.filter((p) => p.game_player_id === player.id)
    : [];

  const myPlayerPicks = playerPicks
    ? playerPicks.filter((p) => p.game_player_id === player.id)
    : [];

  const breakdown = score?.breakdown || {};
  const total = score?.total_points || 0;

  const rankStyle =
    rank === 1
      ? 'lb-row__rank lb-row__rank--top'
      : rank === 2 || rank === 3
      ? 'lb-row__rank'
      : 'lb-row__rank';

  const rankDisplay = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;

  return (
    <div className={`lb-row${isExpanded ? ' lb-row--expanded' : ''}`}>
      <div className="lb-row__header" onClick={onToggle}>
        <span className={rankStyle}>{rankDisplay}</span>
        <span className="lb-row__name">
          {player.player_name}
          {player.is_host && (
            <span className="badge badge-gold" style={{ marginLeft: '0.4rem', fontSize: '0.65rem' }}>
              host
            </span>
          )}
        </span>
        <span className="lb-row__pts">{total} pts</span>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginLeft: '0.25rem' }}>
          {isExpanded ? '▲' : '▼'}
        </span>
      </div>

      {isExpanded && (
        <div className="lb-row__body">
          {myTeamPicks.length > 0 && (
            <div style={{ marginBottom: '0.75rem' }}>
              <div className="label" style={{ marginBottom: '0.4rem' }}>Teams</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {myTeamPicks.map((pick) => {
                  const team = teamMap[pick.team_api_id];
                  return (
                    <div
                      key={pick.id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.3rem',
                        background: 'var(--card-bg)', border: '1px solid var(--border)',
                        borderRadius: 6, padding: '0.25rem 0.5rem', fontSize: '0.8rem',
                      }}
                    >
                      {team?.logo_url && (
                        <img src={team.logo_url} alt="" style={{ width: 18, height: 18, objectFit: 'contain' }} />
                      )}
                      <span>{team?.name || pick.team_api_id}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {myPlayerPicks.length > 0 && (
            <div style={{ marginBottom: '0.75rem' }}>
              <div className="label" style={{ marginBottom: '0.4rem' }}>Players</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {myPlayerPicks.map((pick) => {
                  const pl = playerMap[pick.player_api_id];
                  const isCaptain = pick.player_api_id === captainPickId;
                  return (
                    <div
                      key={pick.id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.3rem',
                        background: isCaptain ? 'rgba(255,215,0,0.08)' : 'var(--card-bg)',
                        border: `1px solid ${isCaptain ? 'var(--gold)' : 'var(--border)'}`,
                        borderRadius: 6, padding: '0.25rem 0.5rem', fontSize: '0.8rem',
                      }}
                    >
                      {isCaptain && <span>👑</span>}
                      <span>{pl?.name || pick.player_api_id}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {Object.keys(breakdown).length > 0 && (
            <div style={{ marginBottom: '0.75rem' }}>
              <div className="label" style={{ marginBottom: '0.4rem' }}>Points Breakdown</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                {Object.entries(breakdown).map(([key, val]) => (
                  <span key={key} className="badge badge-muted">
                    {key}: {val}
                  </span>
                ))}
              </div>
            </div>
          )}

          {isHost && onOverride && (
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
              <div className="label" style={{ marginBottom: '0.4rem' }}>Score Override</div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <input
                  className="input"
                  type="number"
                  placeholder="Points"
                  value={overrideVal}
                  onChange={(e) => setOverrideVal(e.target.value)}
                  style={{ maxWidth: '100px' }}
                />
                <input
                  className="input"
                  placeholder="Reason"
                  value={overrideDesc}
                  onChange={(e) => setOverrideDesc(e.target.value)}
                  style={{ flex: 1 }}
                />
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    if (overrideVal !== '') {
                      onOverride(player, Number(overrideVal), overrideDesc);
                      setOverrideVal('');
                      setOverrideDesc('');
                    }
                  }}
                >
                  Apply
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
