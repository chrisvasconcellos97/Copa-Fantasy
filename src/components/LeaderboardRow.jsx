import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

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
  const [overrideDelta, setOverrideDelta] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const total = score ? score.total_points : 0;
  const isFirst = rank === 1;

  async function handleOverride(e) {
    e.preventDefault();
    if (!overrideDelta || !overrideReason) return;
    setSubmitting(true);
    const delta = parseInt(overrideDelta, 10);
    if (isNaN(delta)) { setSubmitting(false); return; }
    const { error } = await supabase.from('score_overrides').insert({
      game_id: score?.game_id,
      game_player_id: player.id,
      delta_points: delta,
      reason: overrideReason,
    });
    if (!error) {
      setOverrideDelta('');
      setOverrideReason('');
      if (onOverride) onOverride();
    }
    setSubmitting(false);
  }

  return (
    <div className="leaderboard-row">
      <div className="leaderboard-row__header" onClick={onToggle}>
        <div className="leaderboard-row__rank">
          {isFirst ? '🏆' : rank}
        </div>
        <div className="leaderboard-row__name">
          {player.name}
          {isFirst && <span style={{ marginLeft: '0.4rem', fontSize: '0.75rem', color: 'var(--gold-soft)' }}>Champion</span>}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {score && (
            <div style={{ fontSize: '0.72rem', color: 'var(--muted)', textAlign: 'right' }}>
              <div>Teams: {score.team_points || 0}</div>
              <div>Players: {score.player_points || 0}</div>
            </div>
          )}
          <div className="leaderboard-row__points">{total} pts</div>
          <span style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>{isExpanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {isExpanded && (
        <div className="leaderboard-row__body">
          {picks && picks.length > 0 ? (
            <div>
              <div className="section-title">Teams</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1rem' }}>
                {picks.map((pick) => {
                  const team = teams ? teams[pick.team_api_id] : null;
                  return (
                    <div key={pick.id} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'var(--navy-2)', border: '1px solid var(--line)', borderRadius: '6px', padding: '0.25rem 0.6rem' }}>
                      {team?.logo_url && <img src={team.logo_url} alt="" style={{ width: 20, height: 20, objectFit: 'contain' }} />}
                      <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>{team?.name || pick.team_api_id}</span>
                    </div>
                  );
                })}
              </div>

              {playerPicks && playerPicks.length > 0 && (
                <>
                  <div className="section-title">Players</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginBottom: '1rem' }}>
                    {playerPicks.map((pp) => {
                      const pl = players ? players[pp.player_api_id] : null;
                      const isCaptain = pp.id === captainPickId;
                      const draftPick = picks.find((dp) => dp.id === pp.draft_pick_id);
                      const team = teams && draftPick ? teams[draftPick.team_api_id] : null;
                      return (
                        <div key={pp.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.3rem 0.5rem', background: 'var(--navy-2)', borderRadius: '6px', border: isCaptain ? '1px solid var(--gold)' : '1px solid var(--line)' }}>
                          {isCaptain && <span>👑</span>}
                          <span className={`badge badge-${(pp.position || 'mid').toLowerCase()}`}>{pp.position}</span>
                          <span style={{ fontSize: '0.82rem', fontWeight: 600, flex: 1 }}>{pl?.name || pp.player_api_id}</span>
                          {team && <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>{team.name}</span>}
                          {isCaptain && <span className="badge badge-gold">×2</span>}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>No picks yet.</div>
          )}

          {score?.breakdown && (
            <div style={{ marginTop: '0.5rem' }}>
              <div className="section-title">Score Breakdown</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
                Team pts: {score.team_points || 0} · Player pts: {score.player_points || 0} · Captain bonus: {score.captain_bonus || 0}
              </div>
            </div>
          )}

          {isHost && (
            <form className="override-form" onSubmit={handleOverride}>
              <div className="section-title">Host Override</div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="number"
                  className="input"
                  placeholder="±pts"
                  value={overrideDelta}
                  onChange={(e) => setOverrideDelta(e.target.value)}
                  style={{ width: '80px' }}
                />
                <input
                  type="text"
                  className="input"
                  placeholder="Reason"
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  style={{ flex: 1 }}
                />
                <button className="btn btn-gold btn-sm" type="submit" disabled={submitting}>
                  {submitting ? '…' : 'Apply'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
