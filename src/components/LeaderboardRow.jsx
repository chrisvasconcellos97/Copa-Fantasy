import React, { useState } from 'react';

const POSITIONS = ['FWD', 'MID', 'DEF'];

export default function LeaderboardRow({
  rank, player, score, picks, playerPicks, captainPickId,
  teams, players, isExpanded, onToggle, isHost, onOverride,
}) {
  const [overrideDelta, setOverrideDelta] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const rankCls = rank <= 3 ? `lb-row__rank lb-row__rank--${rank}` : 'lb-row__rank';

  // Group player picks by draft_pick_id
  const ppByDraftPick = {};
  if (playerPicks) {
    playerPicks.forEach((pp) => {
      if (!ppByDraftPick[pp.draft_pick_id]) ppByDraftPick[pp.draft_pick_id] = {};
      ppByDraftPick[pp.draft_pick_id][pp.position] = pp;
    });
  }

  // Captain player pick id
  const captainPp = playerPicks && captainPickId
    ? playerPicks.find((pp) => pp.id === captainPickId)
    : null;

  async function handleOverride(e) {
    e.preventDefault();
    if (!overrideReason.trim() || overrideDelta === '') return;
    setSubmitting(true);
    try {
      await onOverride(player.id, parseInt(overrideDelta, 10), overrideReason.trim());
      setOverrideDelta('');
      setOverrideReason('');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="lb-row">
      <div className="lb-row__header" onClick={onToggle}>
        <div className={rankCls}>{rank === 1 ? '🏆' : rank}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{player.name}</div>
          {captainPp && (
            <div className="text-xs text-muted">
              ©️ {players && players[captainPp.player_api_id]?.name || `P${captainPp.player_api_id}`}
            </div>
          )}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--gold)' }}>
            {score ? score.total_points : '—'}
          </div>
          <div className="text-xs text-muted">pts</div>
        </div>
        <div style={{ marginLeft: 8, color: 'var(--muted)' }}>{isExpanded ? '▲' : '▼'}</div>
      </div>

      {isExpanded && (
        <div className="lb-row__body fade-in">
          {score && (
            <div className="flex gap-3" style={{ marginBottom: 12, flexWrap: 'wrap' }}>
              <div className="text-sm"><span className="text-muted">Teams:</span> <strong>{score.team_points}</strong></div>
              <div className="text-sm"><span className="text-muted">Players:</span> <strong>{score.player_points}</strong></div>
              <div className="text-sm"><span className="text-muted">Captain:</span> <strong>{score.captain_bonus}</strong></div>
            </div>
          )}

          <div className="lb-row__squad">
            {picks && picks.map((pick) => {
              const team = teams && (teams[pick.team_api_id] || null);
              const ppByPos = ppByDraftPick[pick.id] || {};
              return (
                <div key={pick.id} className="lb-mini-team">
                  <div className="flex items-center gap-1" style={{ marginBottom: 4 }}>
                    {team?.logo_url && (
                      <img src={team.logo_url} alt="" style={{ width: 16, height: 16, objectFit: 'contain' }} onError={(e) => { e.target.style.display = 'none'; }} />
                    )}
                    <span className="truncate font-semibold" style={{ fontSize: '0.72rem' }}>{team?.name || `T${pick.team_api_id}`}</span>
                  </div>
                  {POSITIONS.map((pos) => {
                    const pp = ppByPos[pos];
                    const pl = pp && players && players[pp.player_api_id];
                    const isCaptain = pp && pp.id === captainPickId;
                    return (
                      <div key={pos} style={{ fontSize: '0.7rem', color: pp ? 'var(--text)' : 'var(--muted)', display: 'flex', gap: 4 }}>
                        <span style={{ color: 'var(--muted)', minWidth: 24 }}>{pos}</span>
                        <span className="truncate">{pl?.name || (pp ? `#${pp.player_api_id}` : '—')}</span>
                        {isCaptain && <span style={{ color: 'var(--gold)' }}>©</span>}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {isHost && onOverride && (
            <form onSubmit={handleOverride} className="override-form" style={{ marginTop: 16 }}>
              <input
                className="input"
                type="number"
                placeholder="±pts"
                value={overrideDelta}
                onChange={(e) => setOverrideDelta(e.target.value)}
                style={{ width: 80, padding: '8px 12px' }}
              />
              <input
                className="input"
                type="text"
                placeholder="Reason"
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                style={{ flex: 1, padding: '8px 12px' }}
              />
              <button className="btn btn-sm btn-secondary" type="submit" disabled={submitting || !overrideReason.trim() || overrideDelta === ''}>
                {submitting ? '…' : 'Override'}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
