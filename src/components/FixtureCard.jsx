import React from 'react';

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function FixtureCard({ fixture, myTeamApiIds = [], isLive }) {
  const homeIsMine = myTeamApiIds.includes(fixture.home_team_api_id);
  const awayIsMine = myTeamApiIds.includes(fixture.away_team_api_id);
  const isMine = homeIsMine || awayIsMine;

  const hasScore =
    fixture.home_score !== null &&
    fixture.home_score !== undefined &&
    fixture.away_score !== null &&
    fixture.away_score !== undefined;

  const classes = [
    'fixture-card',
    isMine ? 'fixture-card--mine' : '',
    isLive ? 'fixture-card--live' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes}>
      <div className="fixture-card__teams">
        <div className="fixture-card__team">
          {fixture.home_logo_url ? (
            <img
              className="fixture-card__logo"
              src={fixture.home_logo_url}
              alt={fixture.home_team_name || fixture.home_team_api_id}
              loading="lazy"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          ) : (
            <span style={{ fontSize: '2rem' }}>🏳️</span>
          )}
          <span
            className="fixture-card__team-name"
            style={{ color: homeIsMine ? 'var(--gold)' : 'var(--text)' }}
          >
            {fixture.home_team_name || fixture.home_team_api_id}
          </span>
        </div>

        <div>
          {hasScore ? (
            <div className={`fixture-card__score${isLive ? ' fixture-card__score--live' : ''}`}>
              {fixture.home_score} – {fixture.away_score}
            </div>
          ) : (
            <div className="fixture-card__score" style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>
              {fixture.kickoff_at ? formatDate(fixture.kickoff_at) : 'TBD'}
            </div>
          )}
          {isLive && (
            <div style={{ textAlign: 'center', marginTop: 4 }}>
              <span className="live-dot">LIVE</span>
            </div>
          )}
        </div>

        <div className="fixture-card__team">
          {fixture.away_logo_url ? (
            <img
              className="fixture-card__logo"
              src={fixture.away_logo_url}
              alt={fixture.away_team_name || fixture.away_team_api_id}
              loading="lazy"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          ) : (
            <span style={{ fontSize: '2rem' }}>🏳️</span>
          )}
          <span
            className="fixture-card__team-name"
            style={{ color: awayIsMine ? 'var(--gold)' : 'var(--text)' }}
          >
            {fixture.away_team_name || fixture.away_team_api_id}
          </span>
        </div>
      </div>

      <div className="fixture-card__status">
        <span className="text-xs text-muted">
          {fixture.status || 'Scheduled'}
        </span>
      </div>
    </div>
  );
}
