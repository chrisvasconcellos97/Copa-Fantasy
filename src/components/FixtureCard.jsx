import React from 'react';

export default function FixtureCard({ fixture, myTeamApiIds = [], isLive }) {
  const myTeams = new Set(myTeamApiIds);
  const homeIsMine = myTeams.has(fixture.home_team_api_id);
  const awayIsMine = myTeams.has(fixture.away_team_api_id);
  const isMyMatch = homeIsMine || awayIsMine;

  const classes = [
    'fixture-card',
    isMyMatch ? 'fixture-card--my-team' : '',
    isLive ? 'fixture-card--live' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const kickoff = fixture.kickoff_at
    ? new Date(fixture.kickoff_at).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  return (
    <div className={classes}>
      {/* Home team */}
      <div className="fixture-card__team">
        {fixture.home_logo_url ? (
          <img src={fixture.home_logo_url} alt={fixture.home_team_name || ''} className="fixture-card__logo" />
        ) : (
          <div className="fixture-card__logo" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>🏴</div>
        )}
        <span className="fixture-card__name">{fixture.home_team_name || fixture.home_team_api_id}</span>
        {homeIsMine && <span className="badge badge-gold" style={{ fontSize: '0.6rem', padding: '1px 5px' }}>Mine</span>}
      </div>

      {/* Score / time */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', minWidth: '90px' }}>
        {isLive && <span className="live-badge">LIVE</span>}
        <div className="fixture-card__score">
          {fixture.home_score != null ? (
            <>
              <span>{fixture.home_score}</span>
              <span className="fixture-card__dash">-</span>
              <span>{fixture.away_score}</span>
            </>
          ) : (
            <span className="text-muted" style={{ fontSize: '0.8rem' }}>{kickoff}</span>
          )}
        </div>
        {fixture.status && !isLive && (
          <span className="text-xs text-muted">{fixture.status}</span>
        )}
      </div>

      {/* Away team */}
      <div className="fixture-card__team">
        {fixture.away_logo_url ? (
          <img src={fixture.away_logo_url} alt={fixture.away_team_name || ''} className="fixture-card__logo" />
        ) : (
          <div className="fixture-card__logo" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>🏴</div>
        )}
        <span className="fixture-card__name">{fixture.away_team_name || fixture.away_team_api_id}</span>
        {awayIsMine && <span className="badge badge-gold" style={{ fontSize: '0.6rem', padding: '1px 5px' }}>Mine</span>}
      </div>
    </div>
  );
}
