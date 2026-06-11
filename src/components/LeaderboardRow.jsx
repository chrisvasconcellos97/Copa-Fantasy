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
  const [overrideReason, setOverrideReason] = useState('');

  const teamsById = {};
  (teams || []).map((t) => { teamsById[t.api_id] = t; });

  const rankDisplay = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;

  function handleOverride() {
    if (!overrideVal) return;
    onOverride && onOverride(player.id, parseInt(overrideVal, 10), overrideReason);
    setOverrideVal('');
    setOverrideReason('');
  }

  return (
    <div className={'lb-row' + (isExpanded ? ' expanded' : '')}>
      <div className="lb-row-main" onClick={onToggle}>
        <span className="lb-rank">{rankDisplay}</span>
        <span className="lb-name">{player?.player_name || player?.name || '—'}</span>
        <span className="lb-pts">{score?.total_points ?? 0} pts</span>
        <span className="lb-chevron">{isExpanded ? '▲' : '▼'}</span>
      </div>
      {isExpanded && (
        <div className="lb-detail">
          {score?.breakdown && (
            <div className="lb-score-breakdown">
              <span>Team pts: {score.breakdown.team_points ?? 0}</span>
              <span>Player pts: {score.breakdown.player_points ?? 0}</span>
              {score.breakdown.captain_bonus != null && (
                <span>Captain bonus: +{score.breakdown.captain_bonus}</span>
              )}
              {score.breakdown.override != null && score.breakdown.override !== 0 && (
                <span>Override: {score.breakdown.override > 0 ? '+' : ''}{score.breakdown.override}</span>
              )}
            </div>
          )}
          <div className="lb-teams">
            {(picks || []).map((pk) => {
              const t = teamsById[pk.team_api_id];
              return t ? (
                <span key={pk.id} className="lb-team-chip">{t.name}</span>
              ) : null;
            })}
          </div>
          {captainPickId && (
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 8 }}>
              👑 Captain: {
                (() => {
                  const pp = (playerPicks || []).find(
                    (p) => p.player_api_id === captainPickId || p.api_id === captainPickId
                  );
                  const pl = (players || []).find(
                    (p) => String(p.api_id) === String(captainPickId)
                  );
                  return pp?.name || pl?.name || captainPickId;
                })()
              }
            </div>
          )}
          {isHost && onOverride && (
            <div className="lb-override">
              <input
                type="number"
                placeholder="±pts"
                value={overrideVal}
                onChange={(e) => setOverrideVal(e.target.value)}
                className="input override-input"
                style={{ width: 80 }}
              />
              <input
                type="text"
                placeholder="Reason (optional)"
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                className="input override-reason"
                style={{ flex: 1 }}
              />
              <button className="btn-sm btn-gold" onClick={handleOverride}>Apply</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
