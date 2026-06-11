export default function FixtureCard({ fixture, myTeamApiIds, isLive }) {
  const isMyMatch = myTeamApiIds &&
    (myTeamApiIds.includes(fixture.home_team_api_id) || myTeamApiIds.includes(fixture.away_team_api_id))
  const kickoff = fixture.kickoff ? new Date(fixture.kickoff).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''
  return (
    <div className={'fixture-card' + (isMyMatch ? ' my-match' : '') + (isLive ? ' live' : '')}>
      {isLive && <span className="live-badge">LIVE {fixture.elapsed ? fixture.elapsed + "'" : ''}</span>}
      <div className="fixture-teams">
        <span className="fixture-team home">{fixture.home_team_name || fixture.home_team_api_id}</span>
        <span className="fixture-score">
          {fixture.home_goals != null ? fixture.home_goals : '-'} : {fixture.away_goals != null ? fixture.away_goals : '-'}
        </span>
        <span className="fixture-team away">{fixture.away_team_name || fixture.away_team_api_id}</span>
      </div>
      {!isLive && <div className="fixture-time">{kickoff}</div>}
    </div>
  )
}
