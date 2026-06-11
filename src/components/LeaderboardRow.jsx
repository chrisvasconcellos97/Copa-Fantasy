import React from 'react';

const RANK_MEDALS = { 1: '🥇', 2: '🥈', 3: '🥉' };

export default function LeaderboardRow({
  rank, player, score, picks = [], playerPicks = [], captainPickId,
  teams = [], players = [], isExpanded, onToggle, isHost, onOverride,
}) {
  const teamMap = Object.fromEntries(teams.map((t) => [t.api_id, t]));
  const playerMap = Object.fromEntries(players.map((p) => [p.api_id, p]));

  const [overrideOpen, setOverrideOpen] = React.useState(false);
  const [delta, setDelta] = React.useState('');
  const [reason, setReason] = React.useState('');

  function handleOverride(e) {
    e.preventDefault();
    onOverride && onOverride({ delta: Number(delta), reason });
    setOverrideOpen(false);
    setDelta('');
    setReason('');
  }

  return (
    <div className={`lb-row${player?.id === captainPickId ? ' lb-row--me' : ''}`}>
      <div className="lb-row__header" onClick={onToggle}>
        <div className="lb-row__rank">
          {RANK_MEDALS[rank] || rank}
        </div>
        <div className="lb-row__name">{player?.name || 'Unknown'}</div>
        <div className="lb-row__pts">{score?.total_points ?? 0} pts</div>
        <div className={`lb-row__chevron${isExpanded ? ' lb-row__chevron--open' : ''}`}>▼</div>
      </div>

      {isExpanded && (
        <div className="lb-row__body">
          <div style={{ display: 'flex', gap: 16, fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 12 }}>
            <span>Teams: <strong style={{ color: 'var(--text)' }}>{score?.team_points ?? 0}</strong></span>
            <span>Players: <strong style={{ color: 'var(--text)' }}>{score?.player_points ?? 0}</strong></span>
            <span>Captain: <strong style={{ color: 'var(--gold-soft)' }}>+{score?.captain_bonus ?? 0}</strong></span>
          </div>

          <div className="section-title">Teams</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
            {picks.map((pick) => {
              const t = teamMap[pick.team_api_id];
              return (
                <div key={pick.id} className="pill" style={{ gap: 4 }}>
                  {t?.logo_url && <img src={t.logo_url} alt="" style={{ width: 14, height: 14, objectFit: 'contain' }} />}
                  {t?.name || pick.team_api_id}
                </div>
              );
            })}
          </div>

          <div className="section-title">Players</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {playerPicks.map((pp) => {
              const pl = playerMap[pp.player_api_id];
              const isCap = pp.id === captainPickId;
              return (
                <div key={pp.id} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: '0.8rem' }}>
                  <span className={`badge badge-${(pp.position || 'fwd').toLowerCase()}`}>{pp.position}</span>
                  <span>{pl?.name || pp.player_api_id}</span>
                  {isCap && <span style={{ color: 'var(--gold-soft)', fontSize: '0.7rem', fontWeight: 800 }}>C 2×</span>}
                </div>
              );
            })}
          </div>

          {isHost && (
            <div style={{ marginTop: 12 }}>
              {!overrideOpen ? (
                <button className="btn btn-ghost btn-sm" onClick={() => setOverrideOpen(true)}>
                  ± Override Points
                </button>
              ) : (
                <form onSubmit={handleOverride} style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                  <input
                    className="input"
                    type="number"
                    placeholder="Delta (e.g. +5 or -3)"
                    value={delta}
                    onChange={(e) => setDelta(e.target.value)}
                    required
                  />
                  <input
                    className="input"
                    type="text"
                    placeholder="Reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    required
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="submit" className="btn btn-primary btn-sm">Apply</button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOverrideOpen(false)}>Cancel</button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
