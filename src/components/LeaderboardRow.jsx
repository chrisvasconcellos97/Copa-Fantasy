import React, { useState } from 'react';

function RankDisplay({ rank }) {
  const cls = rank <= 3 ? `leaderboard-row__rank rank-${rank}` : 'leaderboard-row__rank';
  const medals = { 1: '🥇', 2: '🥈', 3: '🥉' };
  return (
    <span className={cls}>
      {medals[rank] || `#${rank}`}
    </span>
  );
}

export default function LeaderboardRow({
  rank, player, score, picks, playerPicks, captainPickId,
  teams, players, isExpanded, onToggle, isHost, onOverride,
}) {
  const [overrideVal, setOverrideVal] = useState('');

  const myTeams = picks
    ?.filter(p => p.game_player_id === player?.id)
    .map(p => teams?.find(t => t.api_id === p.team_api_id))
    .filter(Boolean);

  const myPlayerPicks = playerPicks
    ?.filter(p => p.game_player_id === player?.id)
    .map(p => players?.find(pl => pl.api_id === p.player_api_id))
    .filter(Boolean);

  const captainPlayer = myPlayerPicks?.find(p => p?.api_id === captainPickId);

  const totalPoints = score?.total_points ?? 0;
  const breakdown = score?.breakdown || {};

  function handleOverride(e) {
    e.stopPropagation();
    if (onOverride && overrideVal !== '') {
      onOverride(player.id, Number(overrideVal));
      setOverrideVal('');
    }
  }

  return (
    <div className="leaderboard-row">
      <div className="leaderboard-row__header" onClick={onToggle} role="button" tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && onToggle && onToggle()}>
        <RankDisplay rank={rank} />
        <span className="leaderboard-row__name">
          {player?.player_name || 'Unknown'}
          {player?.is_host && <span className="badge badge-muted" style={{ marginLeft: 8, fontSize: '0.65rem' }}>Host</span>}
          {captainPlayer && (
            <span style={{ marginLeft: 6, fontSize: '0.8rem', color: 'var(--gold)' }}>
              👑 {captainPlayer.name}
            </span>
          )}
        </span>
        <span className="leaderboard-row__points">{totalPoints} pts</span>
        <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>{isExpanded ? '▲' : '▼'}</span>
      </div>

      {isExpanded && (
        <div className="leaderboard-row__expanded">
          {/* Teams */}
          {myTeams && myTeams.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div className="section-header">Teams</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {myTeams.map(team => (
                  <div key={team.api_id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--border)', borderRadius: 6, padding: '4px 10px' }}>
                    {team.logo_url && (
                      <img src={team.logo_url} alt={team.name} style={{ width: 20, height: 20, objectFit: 'contain' }}
                        onError={e => { e.target.style.display = 'none'; }} />
                    )}
                    <span style={{ fontSize: '0.8rem' }}>{team.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Players */}
          {myPlayerPicks && myPlayerPicks.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div className="section-header">Players</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {myPlayerPicks.map(p => p && (
                  <span key={p.api_id} style={{ fontSize: '0.8rem', background: 'var(--border)', borderRadius: 6, padding: '4px 10px' }}>
                    {p.api_id === captainPickId && '👑 '}{p.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Breakdown */}
          {Object.keys(breakdown).length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div className="section-header">Score Breakdown</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {Object.entries(breakdown).map(([key, val]) => (
                  <span key={key} style={{ fontSize: '0.8rem', background: 'var(--border)', borderRadius: 6, padding: '4px 10px' }}>
                    {key.replace(/_/g, ' ')}: {val > 0 ? '+' : ''}{val}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Host Override */}
          {isHost && onOverride && (
            <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Override points:</span>
              <input
                type="number"
                className="input"
                style={{ width: 100 }}
                value={overrideVal}
                onChange={e => setOverrideVal(e.target.value)}
                placeholder={String(totalPoints)}
                onClick={e => e.stopPropagation()}
              />
              <button className="btn btn-sm btn-primary" onClick={handleOverride}>Set</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
