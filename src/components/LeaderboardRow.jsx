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
  const [overrideNote, setOverrideNote] = useState('');

  const teamMap = {};
  if (teams) teams.forEach((t) => { teamMap[t.api_id] = t; });

  const playerMap = {};
  if (players) players.forEach((p) => { playerMap[p.api_id] = p; });

  const myTeams = picks ? picks.filter((pk) => pk.game_player_id === player.id) : [];
  const myPlayerPicks = playerPicks ? playerPicks.filter((pp) => pp.game_player_id === player.id) : [];
  const captainPlayer = playerMap[captainPickId];

  const totalPoints = score ? score.total_points : 0;
  const breakdown = score ? (score.breakdown || {}) : {};

  return (
    <div className="lb-row">
      <div className="lb-header" onClick={onToggle}>
        <div className={`lb-rank${rank <= 3 ? ' top' : ''}`}>
          {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
            {player.player_name}
            {captainPlayer && (
              <span style={{ color: 'var(--gold)', marginLeft: 6, fontSize: '0.8rem' }}>
                👑 {captainPlayer.name}
              </span>
            )}
          </div>
          <div className="text-xs text-muted">{myTeams.length} teams picked</div>
        </div>
        <div style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--gold)' }}>
          {totalPoints}
          <span className="text-xs text-muted" style={{ marginLeft: 4, fontSize: '0.7rem' }}>pts</span>
        </div>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{isExpanded ? '▲' : '▼'}</span>
      </div>

      {isExpanded && (
        <div className="lb-body">
          {myTeams.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div className="form-label" style={{ marginBottom: 8 }}>Teams</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {myTeams.map((pick) => {
                  const team = teamMap[pick.team_api_id];
                  return (
                    <div key={pick.id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--dark-bg)', padding: '4px 10px', borderRadius: 20, border: '1px solid var(--border)' }}>
                      {team?.logo_url && (
                        <img src={team.logo_url} alt={team.name} style={{ width: 20, height: 20, objectFit: 'contain' }} />
                      )}
                      <span style={{ fontSize: '0.8rem' }}>{team ? team.name : pick.team_api_id}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {myPlayerPicks.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div className="form-label" style={{ marginBottom: 8 }}>Players</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {myPlayerPicks.map((pp) => {
                  const pl = playerMap[pp.player_api_id];
                  const isCaptain = pp.player_api_id === captainPickId;
                  return (
                    <span
                      key={pp.id}
                      style={{
                        fontSize: '0.8rem',
                        background: isCaptain ? 'rgba(255,215,0,0.15)' : 'var(--dark-bg)',
                        padding: '3px 10px',
                        borderRadius: 20,
                        border: `1px solid ${isCaptain ? 'var(--gold)' : 'var(--border)'}`,
                        color: isCaptain ? 'var(--gold)' : 'var(--text)',
                      }}
                    >
                      {isCaptain ? '👑 ' : ''}{pl ? pl.name : pp.player_api_id}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {Object.keys(breakdown).length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div className="form-label" style={{ marginBottom: 6 }}>Score Breakdown</div>
              {Object.entries(breakdown).map(([key, val]) => (
                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', padding: '2px 0', color: 'var(--text-muted)' }}>
                  <span>{key}</span>
                  <span style={{ color: val >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
                    {val >= 0 ? '+' : ''}{val}
                  </span>
                </div>
              ))}
            </div>
          )}

          {isHost && onOverride && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
              <div className="form-label" style={{ marginBottom: 8 }}>Score Override</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="number"
                  className="input"
                  placeholder="Points"
                  value={overrideVal}
                  onChange={(e) => setOverrideVal(e.target.value)}
                  style={{ width: 100 }}
                />
                <input
                  type="text"
                  className="input"
                  placeholder="Note (optional)"
                  value={overrideNote}
                  onChange={(e) => setOverrideNote(e.target.value)}
                  style={{ flex: 1 }}
                />
                <button
                  className="btn btn-gold btn-sm"
                  onClick={() => {
                    onOverride(player.id, parseInt(overrideVal, 10) || 0, overrideNote);
                    setOverrideVal('');
                    setOverrideNote('');
                  }}
                  disabled={!overrideVal}
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
