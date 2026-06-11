import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

const RANK_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'];

export default function LeaderboardRow({ rank, player, score, picks, playerPicks, captainPickId, teams, players, isExpanded, onToggle, isHost, onOverride }) {
  const [overrideVal, setOverrideVal] = useState('');
  const [overrideNote, setOverrideNote] = useState('');

  const teamMap = {};
  if (teams) teams.forEach(t => { teamMap[t.api_id] = t; });

  const playerMap = {};
  if (players) players.forEach(p => { playerMap[p.api_id] = p; });

  const myTeamPicks = (picks || []).filter(p => p.game_player_id === player?.id);
  const myPlayerPicks = (playerPicks || []).filter(p => p.game_player_id === player?.id);
  const captainPlayer = myPlayerPicks.find(p => p.player_api_id === captainPickId);

  const rankColor = RANK_COLORS[rank - 1] || 'var(--text-muted)';

  const handleOverride = () => {
    const pts = parseInt(overrideVal, 10);
    if (isNaN(pts)) return;
    onOverride && onOverride(player?.id, pts, overrideNote);
    setOverrideVal('');
    setOverrideNote('');
  };

  return (
    <div style={{
      background: 'var(--card-bg)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      overflow: 'hidden',
      marginBottom: 8,
    }}>
      <div
        onClick={onToggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '12px 16px',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <div style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          background: rank <= 3 ? rankColor + '22' : 'var(--border)',
          color: rank <= 3 ? rankColor : 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 800,
          fontSize: 13,
          flexShrink: 0,
        }}>
          {rank}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>
            {player?.player_name || player?.name}
            {captainPlayer && (
              <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--gold)' }}>
                👑 {playerMap[captainPlayer.player_api_id]?.name || 'Captain'}
              </span>
            )}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {myTeamPicks.length} teams · {myPlayerPicks.length} players
          </div>
        </div>
        <div style={{ fontWeight: 800, fontSize: 20, color: 'var(--gold)' }}>
          {score?.total_points ?? 0}
          <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 4 }}>pts</span>
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>
          {isExpanded ? '▲' : '▼'}
        </div>
      </div>

      {isExpanded && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '12px 16px', background: '#0d0d14' }}>
          {myTeamPicks.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div className="section-title" style={{ marginBottom: 6 }}>Teams</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {myTeamPicks.map(pick => {
                  const team = teamMap[pick.team_api_id];
                  return (
                    <div key={pick.id} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px' }}>
                      {team?.logo_url && <img src={team.logo_url} alt={team.name} style={{ width: 18, height: 18, objectFit: 'contain' }} />}
                      <span style={{ fontSize: 11, fontWeight: 600 }}>{team?.name || pick.team_api_id}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {myPlayerPicks.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div className="section-title" style={{ marginBottom: 6 }}>Players</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {myPlayerPicks.map(pick => {
                  const pl = playerMap[pick.player_api_id];
                  const isCaptain = pick.player_api_id === captainPickId;
                  return (
                    <div key={pick.id} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--card-bg)', border: `1px solid ${isCaptain ? 'var(--gold)' : 'var(--border)'}`, borderRadius: 6, padding: '4px 8px' }}>
                      {isCaptain && <span style={{ fontSize: 11 }}>👑</span>}
                      <span style={{ fontSize: 11, fontWeight: 600, color: isCaptain ? 'var(--gold)' : 'var(--text)' }}>{pl?.name || pick.player_api_id}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {score?.breakdown && (
            <div style={{ marginBottom: 12 }}>
              <div className="section-title" style={{ marginBottom: 4 }}>Breakdown</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {typeof score.breakdown === 'string' ? score.breakdown : JSON.stringify(score.breakdown)}
              </div>
            </div>
          )}

          {isHost && (
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, marginTop: 4 }}>
              <div className="section-title" style={{ marginBottom: 6 }}>Host Override</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <input
                  className="input"
                  type="number"
                  placeholder="Points"
                  value={overrideVal}
                  onChange={e => setOverrideVal(e.target.value)}
                  style={{ width: 90 }}
                />
                <input
                  className="input"
                  type="text"
                  placeholder="Note (optional)"
                  value={overrideNote}
                  onChange={e => setOverrideNote(e.target.value)}
                  style={{ flex: 1 }}
                />
                <button className="btn btn-gold btn-sm" onClick={handleOverride}>
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
