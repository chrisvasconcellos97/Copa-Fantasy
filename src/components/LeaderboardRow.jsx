import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

function rankClass(rank) {
  if (rank === 1) return 'rank-1';
  if (rank === 2) return 'rank-2';
  if (rank === 3) return 'rank-3';
  return '';
}

function rankEmoji(rank) {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return `#${rank}`;
}

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
  const [saving, setSaving] = useState(false);

  const myTeamIds = picks
    .filter((p) => p.game_player_id === player.id)
    .map((p) => p.team_api_id);

  const myTeams = myTeamIds
    .map((tid) => teams.find((t) => t.api_id === tid))
    .filter(Boolean);

  const myPlayerPicks = (playerPicks || []).filter((pp) => pp.game_player_id === player.id);
  const myPlayers = myPlayerPicks
    .map((pp) => players.find((pl) => pl.api_id === pp.player_api_id))
    .filter(Boolean);

  const captain = players.find((pl) => pl.api_id === captainPickId);

  async function handleOverride() {
    const pts = parseInt(overrideVal, 10);
    if (isNaN(pts)) return;
    setSaving(true);
    try {
      await onOverride(player.id, pts, overrideDesc);
      setOverrideVal('');
      setOverrideDesc('');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="leaderboard-row">
      <div className="leaderboard-row-header" onClick={onToggle}>
        <span className={`leaderboard-rank ${rankClass(rank)}`}>{rankEmoji(rank)}</span>
        <div style={{ flex: 1 }}>
          <div className="leaderboard-name">{player.player_name}</div>
          {captain && (
            <div className="text-xs text-muted mt-4">C: {captain.name}</div>
          )}
        </div>
        <span className="leaderboard-points">{score?.total_points ?? 0} pts</span>
        <span className="text-muted text-sm" style={{ marginLeft: 8 }}>{isExpanded ? '▲' : '▼'}</span>
      </div>

      {isExpanded && (
        <div className="leaderboard-expanded fade-in">
          {myTeams.length > 0 && (
            <div className="mb-12">
              <div className="text-xs text-muted font-600 mb-8">TEAMS</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {myTeams.map((team) => (
                  <div key={team.api_id} className="chip">
                    {team.logo_url && (
                      <img src={team.logo_url} alt="" style={{ width: 18, height: 18, objectFit: 'contain' }} />
                    )}
                    {team.name}
                  </div>
                ))}
              </div>
            </div>
          )}

          {myPlayers.length > 0 && (
            <div className="mb-12">
              <div className="text-xs text-muted font-600 mb-8">PLAYERS</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {myPlayers.map((pl) => (
                  <div key={pl.api_id} className={`chip${pl.api_id === captainPickId ? ' chip-mine' : ''}`}>
                    {pl.api_id === captainPickId && '👑 '}
                    {pl.name}
                  </div>
                ))}
              </div>
            </div>
          )}

          {score?.breakdown && Object.keys(score.breakdown).length > 0 && (
            <div className="mb-12">
              <div className="text-xs text-muted font-600 mb-8">SCORE BREAKDOWN</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {Object.entries(score.breakdown).map(([key, val]) => (
                  <div key={key} className="row-between text-sm">
                    <span className="text-muted">{key.replace(/_/g, ' ')}</span>
                    <span className={val >= 0 ? 'text-success' : 'text-danger'}>{val >= 0 ? '+' : ''}{val}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isHost && (
            <div className="card-section mt-12">
              <div className="text-xs text-muted font-600 mb-8">SCORE OVERRIDE (HOST)</div>
              <div className="col gap-8">
                <input
                  type="number"
                  className="input"
                  placeholder="Points adjustment (e.g. +5 or -2)"
                  value={overrideVal}
                  onChange={(e) => setOverrideVal(e.target.value)}
                />
                <input
                  type="text"
                  className="input"
                  placeholder="Reason (optional)"
                  value={overrideDesc}
                  onChange={(e) => setOverrideDesc(e.target.value)}
                />
                <button className="btn btn-primary btn-sm" onClick={handleOverride} disabled={saving || !overrideVal}>
                  {saving ? 'Saving...' : 'Apply Override'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
