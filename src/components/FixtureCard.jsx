export default function FixtureCard({ fixture, myTeamApiIds, isLive }) {
  const myMatch = myTeamApiIds &&
    (myTeamApiIds.has(fixture.home_team_api_id) || myTeamApiIds.has(fixture.away_team_api_id));

  const matchDate = fixture.match_date ? new Date(fixture.match_date) : null;
  const dateStr = matchDate ? matchDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

  return (
    <div className={`fixture-card card ${myMatch ? 'my-match' : ''} ${isLive ? 'live-match' : ''}`}>
      {isLive && <div className="live-badge">🔴 LIVE</div>}
      <div className="fixture-date text-muted text-sm">{dateStr}</div>
      <div className="fixture-teams">
        <div className={`fixture-team ${myTeamApiIds?.has(fixture.home_team_api_id) ? 'my-team' : ''}`}>
          {fixture.home_logo_url && (
            <img src={fixture.home_logo_url} alt={fixture.home_team_name} width={32} height={32} />
          )}
          <span className="text-sm font-bold">{fixture.home_team_name}</span>
        </div>
        <div className="fixture-score">
          {fixture.home_score !== null && fixture.away_score !== null
            ? <span className="text-gold font-bold text-lg">{fixture.home_score} - {fixture.away_score}</span>
            : <span className="text-muted">vs</span>
          }
        </div>
        <div className={`fixture-team fixture-team-away ${myTeamApiIds?.has(fixture.away_team_api_id) ? 'my-team' : ''}`}>
          {fixture.away_logo_url && (
            <img src={fixture.away_logo_url} alt={fixture.away_team_name} width={32} height={32} />
          )}
          <span className="text-sm font-bold">{fixture.away_team_name}</span>
        </div>
      </div>
      <div className="fixture-status text-muted text-sm">{fixture.status}</div>
    </div>
  );
}
