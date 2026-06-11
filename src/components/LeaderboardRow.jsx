import React, { useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { normalizePosition } from '../lib/constants.js';

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
  const [saving, setSaving] = useState(false);

  const teamMap = {};
  (teams || []).forEach((t) => { teamMap[t.api_id] = t; });
  const playerMap = {};
  (players || []).forEach((p) => { playerMap[p.api_id] = p; });

  const myTeamPicks = (picks || []).filter((p) => p.game_player_id === player?.game_player_id || p.game_player_id === player?.id);
  const myPlayerPicks = (playerPicks || []).filter(
    (p) => p.game_player_id === player?.game_player_id || p.game_player_id === player?.id
  );

  async function handleOverride() {
    const pts = parseInt(overrideVal, 10);
    if (isNaN(pts)) return;
    setSaving(true);
    if (onOverride) await onOverride(player?.game_player_id || player?.id, pts, overrideNote);
    setSaving(false);
    setOverrideVal('');
    setOverrideNote('');
  }

  const rankClass = rank <= 3 ? `rank-badge rank-${rank}` : 'rank-badge';
  const playerName = player?.player_name || player?.game_players?.player_name || 'Unknown';
  const totalPoints = score?.total_points ?? 0;
  const captain = myPlayerPicks.find(
    (p) => p.player_api_id === captainPickId
  );
  const captainPlayer = captain ? playerMap[captain.player_api_id] : null;

  return (
    <div className="leaderboard-row">
      <div className="leaderboard-row-header" onClick={onToggle}>
        <div className={rankClass}>{rank}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600 }}>{playerName}</div>
          {captainPlayer && (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              👑 {captainPlayer.name}
            </div>
          )}
        </div>
        <div className="score-points">{totalPoints} pts</div>
        <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>{isExpanded ? '▲' : '▼'}</span>
      </div>

      {isExpanded && (
        <div className="leaderboard-row-body">
          {/* Teams */}
          {myTeamPicks.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div className="section-title" style={{ marginBottom: 8 }}>Teams</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {myTeamPicks.map((pick) => {
                  const team = teamMap[pick.team_api_id];
                  return (
                    <div
                      key={pick.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        background: 'var(--dark-bg)',
                        border: '1px solid var(--border)',
                        borderRadius: 8,
                        padding: '4px 10px',
                        fontSize: '0.82rem',
                      }}
                    >
                      {team?.logo_url && (
                        <img src={team.logo_url} alt={team.name} style={{ width: 20, height: 20, objectFit: 'contain' }} />
                      )}
                      <span>{team?.name || pick.team_api_id}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Player picks */}
          {myPlayerPicks.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div className="section-title" style={{ marginBottom: 8 }}>Players</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {myPlayerPicks.map((pick) => {
                  const pl = playerMap[pick.player_api_id];
                  const isCaptain = pick.player_api_id === captainPickId;
                  const pos = normalizePosition(pl?.position);
                  return (
                    <div
                      key={pick.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        background: isCaptain ? 'rgba(255,215,0,0.1)' : 'var(--dark-bg)',
                        border: `1px solid ${isCaptain ? 'var(--gold)' : 'var(--border)'}`,
                        borderRadius: 8,
                        padding: '4px 10px',
                        fontSize: '0.82rem',
                      }}
                    >
                      {isCaptain && <span>👑</span>}
                      <span>{pl?.name || pick.player_api_id}</span>
                      {pl && <span className={`position-badge pos-${pos}`}>{pos}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Score breakdown */}
          {score?.breakdown && (
            <div style={{ marginBottom: 12 }}>
              <div className="section-title" style={{ marginBottom: 8 }}>Breakdown</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', whiteSpace: 'pre-wrap' }}>
                {typeof score.breakdown === 'string'
                  ? score.breakdown
                  : JSON.stringify(score.breakdown, null, 2)}
              </div>
            </div>
          )}

          {/* Host override */}
          {isHost && (
            <div className="override-row">
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', flexShrink: 0 }}>Override pts:</span>
              <input
                className="input"
                type="number"
                placeholder="Points"
                value={overrideVal}
                onChange={(e) => setOverrideVal(e.target.value)}
                style={{ width: 90 }}
              />
              <input
                className="input"
                type="text"
                placeholder="Note"
                value={overrideNote}
                onChange={(e) => setOverrideNote(e.target.value)}
                style={{ flex: 1 }}
              />
              <button
                className="btn btn-primary btn-sm"
                onClick={handleOverride}
                disabled={saving || !overrideVal}
              >
                {saving ? '...' : 'Set'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
