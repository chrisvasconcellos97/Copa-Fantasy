import { useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { TEAM_POINTS, PLAYER_POINTS } from '../lib/scoring.js';

export default function LeaderboardRow({ rank, player, score, picks, playerPicks, captainPickId, teams, players, isExpanded, onToggle, isHost, onOverride }) {
  const [overrideVal, setOverrideVal] = useState('');
  const [overrideNote, setOverrideNote] = useState('');

  const breakdown = score?.breakdown || {};
  const totalPoints = score?.total_points ?? 0;

  const myTeamPicks = (picks || []).filter(p => p.game_player_id === player?.id && p.pick_type === 'team');
  const myPlayerPicks = (playerPicks || []).filter(p => p.game_player_id === player?.id && p.pick_type === 'player');

  const handleOverride = () => {
    if (onOverride) onOverride(player.id, parseFloat(overrideVal), overrideNote);
    setOverrideVal('');
    setOverrideNote('');
  };

  return (
    <div className={`leaderboard-row card mb-2 ${isExpanded ? 'expanded' : ''}`}>
      <div className="leaderboard-row-header" onClick={onToggle} role="button" tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && onToggle()}>
        <div className="leaderboard-rank text-gold font-bold">#{rank}</div>
        <div className="leaderboard-name font-bold">{player?.player_name}</div>
        <div className="leaderboard-points text-gold font-bold">{totalPoints} pts</div>
        <div className="leaderboard-chevron">{isExpanded ? '▲' : '▼'}</div>
      </div>
      {isExpanded && (
        <div className="leaderboard-breakdown p-2">
          <div className="mb-2">
            <h4 className="text-sm text-muted mb-1">Teams</h4>
            <div className="grid-2">
              {myTeamPicks.map(pick => {
                const team = teams?.find(t => t.api_id === pick.team_api_id);
                const teamBreakdown = breakdown?.teams?.[pick.team_api_id] || {};
                const teamPts = Object.values(teamBreakdown).reduce((a, b) => a + b, 0);
                const isCaptain = pick.id === captainPickId;
                return (
                  <div key={pick.id} className="breakdown-team-row">
                    <div className="flex gap-1" style={{ alignItems: 'center' }}>
                      {team?.logo_url && <img src={team.logo_url} alt={team.name} width={18} height={18} />}
                      <span className="text-sm">{team?.name} {isCaptain ? '👑' : ''}</span>
                    </div>
                    <span className="text-gold text-sm">{isCaptain ? teamPts * 2 : teamPts} pts</span>
                  </div>
                );
              })}
            </div>
          </div>
          {myPlayerPicks.length > 0 && (
            <div className="mb-2">
              <h4 className="text-sm text-muted mb-1">Player Bonuses</h4>
              <div className="grid-2">
                {myPlayerPicks.map(pick => {
                  const playerData = players?.find(p => p.api_id === pick.player_api_id);
                  const bonusPts = breakdown?.players?.[pick.player_api_id] || 0;
                  return (
                    <div key={pick.id} className="breakdown-player-row">
                      <span className="text-sm">{playerData?.name || pick.player_api_id}</span>
                      <span className="text-gold text-sm">{bonusPts} pts</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {breakdown?.override ? (
            <div className="text-sm text-muted">Override: +{breakdown.override} pts {breakdown.override_note ? `(${breakdown.override_note})` : ''}</div>
          ) : null}
          {isHost && (
            <div className="override-section mt-2">
              <h4 className="text-sm text-muted mb-1">Host Override</h4>
              <div className="flex gap-1">
                <input type="number" placeholder="Points" value={overrideVal}
                  onChange={e => setOverrideVal(e.target.value)} style={{ width: '80px' }} />
                <input type="text" placeholder="Note" value={overrideNote}
                  onChange={e => setOverrideNote(e.target.value)} style={{ flex: 1 }} />
                <button className="btn btn-secondary" onClick={handleOverride}>Apply</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
