export default function FixtureCard({ fixture, myTeamApiIds = [], isLive }) {
  const myTeams = new Set(myTeamApiIds);
  const homeIsMine = myTeams.has(fixture.home_team_api_id);
  const awayIsMine = myTeams.has(fixture.away_team_api_id);
  const isMyFixture = homeIsMine || awayIsMine;

  const classes = [
    'fixture-card',
    isMyFixture ? 'fixture-card--my-team' : '',
    isLive ? 'fixture-card--live' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const hasScore =
    fixture.home_score != null && fixture.away_score != null;

  return (
    <div className={classes}>
      <div className={`fixture-card__team${homeIsMine ? ' text-gold' : ''}`}>
        {fixture.home_logo_url ? (
          <img className="fixture-card__logo" src={fixture.home_logo_url} alt={fixture.home_team_name || ''} />
        ) : (
          <span style={{ fontSize: '1.2rem' }}>🏴</span>
        )}
        <span className="fixture-card__team-name">{fixture.home_team_name || fixture.home_team_api_id}</span>
      </div>

      <div className={`fixture-card__score${hasScore ? '' : ' fixture-card__score--pending'}`}>
        {isLive && (
          <div style={{ marginBottom: '2px' }}>
            <span className="badge badge-live" style={{ fontSize: '0.6rem' }}>LIVE</span>
          </div>
        )}
        {hasScore ? (
          <span>{fixture.home_score} – {fixture.away_score}</span>
        ) : (
          <span>vs</span>
        )}
        {fixture.kickoff_at && !hasScore && (
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            {new Date(fixture.kickoff_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        )}
      </div>

      <div className={`fixture-card__team fixture-card__team--away${awayIsMine ? ' text-gold' : ''}`}>
        {fixture.away_logo_url ? (
          <img className="fixture-card__logo" src={fixture.away_logo_url} alt={fixture.away_team_name || ''} />
        ) : (
          <span style={{ fontSize: '1.2rem' }}>🏴</span>
        )}
        <span className="fixture-card__team-name">{fixture.away_team_name || fixture.away_team_api_id}</span>
      </div>
    </div>
  );
}
