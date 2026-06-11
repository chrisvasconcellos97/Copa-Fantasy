import React from 'react';

function formatKickoff(kickoffAt) {
  if (!kickoffAt) return '';
  const d = new Date(kickoffAt);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function FixtureCard({ fixture, myTeamApiIds = [], isLive }) {
  const homeIsMyTeam = myTeamApiIds.includes(fixture.home_team_api_id);
  const awayIsMyTeam = myTeamApiIds.includes(fixture.away_team_api_id);
  const isMyGame = homeIsMyTeam || awayIsMyTeam;

  const statusText = fixture.status === 'FT' ? 'Full Time'
    : fixture.status === 'NS' ? formatKickoff(fixture.kickoff_at)
    : fixture.status || '';

  return (
    <div className={[
      'fixture-card',
      isMyGame ? 'my-team' : '',
      isLive ? 'live-fixture' : '',
    ].filter(Boolean).join(' ')}>
      <div className="fixture-teams">
        <div className="fixture-team">
          {fixture.home_logo_url ? (
            <img src={fixture.home_logo_url} alt="" className="fixture-logo" />
          ) : (
            <span style={{ fontSize: '1.5rem' }}>⚽</span>
          )}
          <span className={`fixture-team-name${homeIsMyTeam ? ' my-team' : ''}`}>
            {fixture.home_team_name || fixture.home_team_api_id}
          </span>
        </div>

        <div className="fixture-score">
          {fixture.home_score != null ? (
            <>
              <span>{fixture.home_score}</span>
              <span className="fixture-dash">–</span>
              <span>{fixture.away_score}</span>
            </>
          ) : (
            <span className="fixture-dash" style={{ fontSize: '1rem', color: 'var(--text-dim)' }}>vs</span>
          )}
        </div>

        <div className="fixture-team">
          {fixture.away_logo_url ? (
            <img src={fixture.away_logo_url} alt="" className="fixture-logo" />
          ) : (
            <span style={{ fontSize: '1.5rem' }}>⚽</span>
          )}
          <span className={`fixture-team-name${awayIsMyTeam ? ' my-team' : ''}`}>
            {fixture.away_team_name || fixture.away_team_api_id}
          </span>
        </div>
      </div>

      <div className="fixture-meta">
        {isLive ? (
          <span className="badge badge-live">🔴 LIVE</span>
        ) : (
          <span className="text-xs text-muted">{statusText}</span>
        )}
        {isMyGame && <span className="badge badge-gold">Your Team</span>}
      </div>
    </div>
  );
}
