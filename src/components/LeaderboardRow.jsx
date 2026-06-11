import React, { useState } from 'react';

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

  const teamMap = {};
  (teams || []).forEach((t) => { teamMap[t.api_id] = t; });

  const playerMap = {};
  (players || []).forEach((p) => { playerMap[p.api_id] = p; });

  const myTeamPicks = (picks || []).filter((p) => p.game_player_id === player.id);
  const myPlayerPicks = (playerPicks || []).filter((p) => p.game_player_id === player.id);
  const breakdown = score?.breakdown || {};

  const handleOverride = () => {
    const pts = parseInt(overrideVal, 10);
    if (!isNaN(pts) && onOverride) {
      onOverride(player.id, pts);
      setOverrideVal('');
    }
  };

  return (
    <div className={`lb-row ${isExpanded ? 'lb-row--expanded' : ''}`}>
      <div className="lb-row__header" onClick={onToggle}>
        <span className={`lb-row__rank ${rank <= 3 ? 'lb-row__rank--top3' : ''}`}>
          {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank}
        </span>
        <span className="lb-row__name">
          {player.player_name}
          {player.is_host && ' 👑'}
          {captainPickId && myPlayerPicks.some((p) => p.player_api_id === captainPickId) && (
            <span style={{ marginLeft: 6, fontSize: '0.75rem', color: 'var(--gold)' }}>© Captain</span>
          )}
        </span>
        <span className="lb-row__points">{score?.total_points ?? 0} pts</span>
        <span className="text-muted" style={{ fontSize: '0.8rem', marginLeft: 4 }}>{isExpanded ? '▲' : '▼'}</span>
      </div>

      {isExpanded && (
        <div className="lb-row__body">
          {/* Teams */}
          {myTeamPicks.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <div className="section-title">Teams</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {myTeamPicks.map((pick) => {
                  const t = teamMap[pick.team_api_id];
                  return (
                    <div
                      key={pick.id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        background: 'var(--border)', borderRadius: '6px', padding: '4px 10px',
                        fontSize: '0.8rem', fontWeight: 600,
                      }}
                    >
                      {t?.logo_url && <img src={t.logo_url} alt={t?.name} style={{ width: 18, height: 18, objectFit: 'contain' }} />}
                      {t?.name || pick.team_api_id}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Player picks */}
          {myPlayerPicks.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <div className="section-title">Players</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {myPlayerPicks.map((pick) => {
                  const p = playerMap[pick.player_api_id];
                  const isCap = pick.player_api_id === captainPickId;
                  return (
                    <div
                      key={pick.id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        background: isCap ? 'rgba(255,215,0,0.12)' : 'var(--border)',
                        border: isCap ? '1px solid var(--gold)' : '1px solid transparent',
                        borderRadius: '6px', padding: '4px 10px',
                        fontSize: '0.8rem', fontWeight: 600,
                      }}
                    >
                      {isCap && '👑 '}
                      {p?.name || pick.player_api_id}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Score breakdown */}
          {Object.keys(breakdown).length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <div className="section-title">Score Breakdown</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {Object.entries(breakdown).map(([key, val]) => (
                  <span
                    key={key}
                    style={{
                      background: 'var(--border)', borderRadius: '6px', padding: '3px 10px',
                      fontSize: '0.75rem',
                    }}
                  >
                    {key.replace(/_/g, ' ')}: <strong style={{ color: val >= 0 ? 'var(--success)' : 'var(--danger)' }}>{val >= 0 ? '+' : ''}{val}</strong>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Host override */}
          {isHost && onOverride && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '8px' }}>
              <input
                type="number"
                className="input"
                placeholder="Override total points"
                value={overrideVal}
                onChange={(e) => setOverrideVal(e.target.value)}
                style={{ maxWidth: '200px' }}
              />
              <button className="btn btn-sm btn-secondary" onClick={handleOverride}>
                Set Points
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
