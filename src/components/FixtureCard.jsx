import React from 'react';

function formatKickoff(kickoffAt) {
  if (!kickoffAt) return '';
  const d = new Date(kickoffAt);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function FixtureCard({ fixture, myTeamApiIds = [], isLive }) {
  const homeId = String(fixture.home_team_api_id);
  const awayId = String(fixture.away_team_api_id);
  const isMine = myTeamApiIds.map(String).includes(homeId) || myTeamApiIds.map(String).includes(awayId);

  const cls = [
    'fixture-card',
    isLive ? 'fixture-card--live' : '',
    isMine && !isLive ? 'fixture-card--mine' : '',
  ].filter(Boolean).join(' ');

  const status = fixture.status || fixture.status_short || '';
  const isFinished = ['FT', 'AET', 'PEN'].includes(status);
  const isScheduled = ['NS', 'TBD', ''].includes(status);
  const hasScore = fixture.home_score != null && fixture.away_score != null;

  return (
    <div className={cls}>
      {isMine && (
        <div style={{ fontSize: '0.7rem', color: 'var(--gold)', fontWeight: 700, marginBottom: 8 }}>
          ⭐ Your team is playing
        </div>
      )}
      <div className="fixture-card__teams">
        <div className="fixture-card__team">
          {fixture.home_logo_url ? (
            <img className="fixture-card__team-logo" src={fixture.home_logo_url} alt={fixture.home_name || ''} loading="lazy" />
          ) : (
            <div className="fixture-card__team-logo" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>⚽</div>
          )}
          <span className="fixture-card__team-name">{fixture.home_name || homeId}</span>
        </div>
        <div className="fixture-card__score">
          {hasScore ? (
            <span className="fixture-card__score-line">
              {fixture.home_score} – {fixture.away_score}
            </span>
          ) : (
            <span className="fixture-card__score-line" style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>
              {formatKickoff(fixture.kickoff_at)}
            </span>
          )}
          <span className={`fixture-card__status${isLive ? ' fixture-card__status--live' : ''}`}>
            {isLive && <span className="live-dot" />}
            {isLive
              ? `${fixture.elapsed || 0}'`
              : isFinished
              ? 'FT'
              : isScheduled
              ? (fixture.round || 'Upcoming')
              : status}
          </span>
        </div>
        <div className="fixture-card__team">
          {fixture.away_logo_url ? (
            <img className="fixture-card__team-logo" src={fixture.away_logo_url} alt={fixture.away_name || ''} loading="lazy" />
          ) : (
            <div className="fixture-card__team-logo" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>⚽</div>
          )}
          <span className="fixture-card__team-name">{fixture.away_name || awayId}</span>
        </div>
      </div>
    </div>
  );
}
