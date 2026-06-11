import React from 'react';

function fmt(kickoff) {
  if (!kickoff) return '';
  const d = new Date(kickoff);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function FixtureCard({ fixture, myTeamApiIds = [], isLive }) {
  const mine = myTeamApiIds.includes(fixture.home_team_api_id) || myTeamApiIds.includes(fixture.away_team_api_id);
  const live = isLive || ['1H', '2H', 'HT', 'ET', 'P', 'LIVE'].includes(fixture.status_short);
  const finished = ['FT', 'AET', 'PEN'].includes(fixture.status_short);

  const cls = [
    'fixture-card',
    mine ? 'fixture-card--mine' : '',
    live ? 'fixture-card--live' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={cls}>
      <div className="fixture-card__teams">
        <div className="fixture-card__team">
          <span style={{ fontSize: '0.85rem' }}>{fixture.home_team_name || fixture.home_team_api_id}</span>
        </div>
        <div className="fixture-card__score">
          {finished || live
            ? `${fixture.home_goals ?? 0} - ${fixture.away_goals ?? 0}`
            : 'vs'
          }
        </div>
        <div className="fixture-card__team">
          <span style={{ fontSize: '0.85rem' }}>{fixture.away_team_name || fixture.away_team_api_id}</span>
        </div>
      </div>
      <div className="fixture-card__meta">
        {live && <span className="badge badge-live">LIVE {fixture.elapsed ? `${fixture.elapsed}'` : ''}</span>}
        {finished && <span className="pill">FT</span>}
        {!live && !finished && <span>{fmt(fixture.kickoff)}</span>}
        {fixture.round && <span>· {fixture.round}</span>}
        {mine && <span style={{ color: 'var(--gold-soft)' }}>⭐ Your team</span>}
      </div>
    </div>
  );
}
