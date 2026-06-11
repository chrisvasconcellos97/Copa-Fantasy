export default function FixtureCard({ fixture, myTeamApiIds = [], isLive = false }) {
  const homeId = String(fixture?.home_team_api_id || '');
  const awayId = String(fixture?.away_team_api_id || '');
  const myTeamIds = myTeamApiIds.map(String);
  const isMyMatch = myTeamIds.includes(homeId) || myTeamIds.includes(awayId);

  const classes = [
    'fixture-card',
    isMyMatch ? 'my-team' : '',
    isLive ? 'live' : '',
  ].filter(Boolean).join(' ');

  const hasScore =
    fixture?.home_score !== null &&
    fixture?.home_score !== undefined &&
    fixture?.away_score !== null &&
    fixture?.away_score !== undefined;

  const kickoff = fixture?.kickoff_at
    ? new Date(fixture.kickoff_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '--:--';

  const homeFallback = `https://ui-avatars.com/api/?name=H&background=2a2a3a&color=e8e8f0&size=32`;
  const awayFallback = `https://ui-avatars.com/api/?name=A&background=2a2a3a&color=e8e8f0&size=32`;

  return (
    <div className={classes}>
      <div className="fixture-teams">
        {/* Home */}
        <div className="fixture-team">
          <img
            src={fixture?.home_logo_url || homeFallback}
            alt={fixture?.home_team_name || 'Home'}
            className="fixture-logo"
            onError={(e) => { e.target.src = homeFallback; }}
          />
          <span
            className="fixture-team-name"
            style={{ color: myTeamIds.includes(homeId) ? 'var(--gold)' : 'var(--text)' }}
          >
            {fixture?.home_team_name || `Team ${homeId}`}
          </span>
        </div>

        {/* Score / Time */}
        <div style={{ textAlign: 'center', minWidth: 64 }}>
          {isLive && (
            <div style={{ marginBottom: 2 }}>
              <span className="badge badge-live">LIVE</span>
            </div>
          )}
          {hasScore ? (
            <div className="fixture-score">
              {fixture.home_score} – {fixture.away_score}
            </div>
          ) : (
            <div className="fixture-time">{kickoff}</div>
          )}
        </div>

        {/* Away */}
        <div className="fixture-team away">
          <img
            src={fixture?.away_logo_url || awayFallback}
            alt={fixture?.away_team_name || 'Away'}
            className="fixture-logo"
            onError={(e) => { e.target.src = awayFallback; }}
          />
          <span
            className="fixture-team-name"
            style={{ color: myTeamIds.includes(awayId) ? 'var(--gold)' : 'var(--text)' }}
          >
            {fixture?.away_team_name || `Team ${awayId}`}
          </span>
        </div>
      </div>
    </div>
  );
}
