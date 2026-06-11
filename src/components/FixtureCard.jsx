import React from 'react';

function formatKickoff(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function FixtureCard({ fixture, myTeamApiIds = [], isLive }) {
  const myHome = myTeamApiIds.includes(fixture.home_team_api_id);
  const myAway = myTeamApiIds.includes(fixture.away_team_api_id);
  const hasMyTeam = myHome || myAway;

  const classes = [
    'fixture-card',
    hasMyTeam ? 'my-team' : '',
    isLive ? 'live' : '',
  ].filter(Boolean).join(' ');

  const hasScore = fixture.home_score !== null && fixture.away_score !== null;

  return (
    <div className={classes}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          {formatKickoff(fixture.kickoff_at)}
        </span>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {hasMyTeam && <span className="badge badge-gold">MY TEAM</span>}
          {isLive && <span className="badge badge-live">LIVE</span>}
          {!isLive && fixture.status === 'FT' && <span className="badge badge-muted">FT</span>}
        </div>
      </div>
      <div className="fixture-teams">
        <div className={`fixture-team${myHome ? ' text-gold' : ''}`}>
          {fixture.home_logo_url && (
            <img src={fixture.home_logo_url} alt={fixture.home_team_name || 'Home'} />
          )}
          <span className="fixture-team-name">{fixture.home_team_name || fixture.home_team_api_id}</span>
        </div>
        <div className="fixture-score">
          {hasScore ? `${fixture.home_score} - ${fixture.away_score}` : <span className="fixture-vs">vs</span>}
        </div>
        <div className={`fixture-team${myAway ? ' text-gold' : ''}`}>
          {fixture.away_logo_url && (
            <img src={fixture.away_logo_url} alt={fixture.away_team_name || 'Away'} />
          )}
          <span className="fixture-team-name">{fixture.away_team_name || fixture.away_team_api_id}</span>
        </div>
      </div>
    </div>
  );
}
