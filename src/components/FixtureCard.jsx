import React from 'react';

function formatKickoff(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function FixtureCard({ fixture, myTeamApiIds = [], isLive }) {
  const homeMine = myTeamApiIds.includes(fixture.home_team_api_id);
  const awayMine = myTeamApiIds.includes(fixture.away_team_api_id);
  const anyMine = homeMine || awayMine;

  let cls = 'fixture-card';
  if (isLive) cls += ' fixture-card--live';
  else if (anyMine) cls += ' fixture-card--mine';

  const statusShort = fixture.status_short || '';
  const isFinished = ['FT', 'AET', 'PEN'].includes(statusShort);
  const isNS = statusShort === 'NS';

  return (
    <div className={cls}>
      <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
        <span className="text-xs text-muted">{fixture.round || ''}</span>
        <div className="flex items-center gap-2">
          {isLive && <span className="status-pill status-pill--live">LIVE {fixture.elapsed ? `${fixture.elapsed}'` : ''}</span>}
          {isFinished && <span className="badge badge-muted">FT</span>}
          {isNS && <span className="text-xs text-muted">{formatKickoff(fixture.kickoff)}</span>}
          {anyMine && <span className="badge badge-gold">MY TEAM</span>}
        </div>
      </div>

      <div className="fixture-teams">
        <div className="fixture-team" style={homeMine ? { color: 'var(--gold)' } : {}}>
          {fixture.home_logo && (
            <img src={fixture.home_logo} alt="" onError={(e) => { e.target.style.display = 'none'; }} />
          )}
          <span className="fixture-team__name">{fixture.home_name || `Team ${fixture.home_team_api_id}`}</span>
        </div>

        <div className="fixture-score">
          {(isLive || isFinished)
            ? `${fixture.home_goals ?? 0} - ${fixture.away_goals ?? 0}`
            : 'vs'}
        </div>

        <div className="fixture-team" style={awayMine ? { color: 'var(--gold)' } : {}}>
          {fixture.away_logo && (
            <img src={fixture.away_logo} alt="" onError={(e) => { e.target.style.display = 'none'; }} />
          )}
          <span className="fixture-team__name">{fixture.away_name || `Team ${fixture.away_team_api_id}`}</span>
        </div>
      </div>
    </div>
  );
}
