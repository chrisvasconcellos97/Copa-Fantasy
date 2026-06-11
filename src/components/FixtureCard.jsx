import React from 'react'

export default function FixtureCard({ fixture, myTeamApiIds = [], isLive = false }) {
  const homeId = fixture.home_team_api_id
  const awayId = fixture.away_team_api_id
  const isMyGame = myTeamApiIds.includes(homeId) || myTeamApiIds.includes(awayId)

  const hasScore = fixture.home_goals !== null && fixture.away_goals !== null
  const kickoff = fixture.kickoff ? new Date(fixture.kickoff) : null

  const formatTime = (date) => {
    if (!date) return '--:--'
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className={`fixture-card${isMyGame ? ' my-game' : ''}${isLive ? ' live' : ''}`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.625rem' }}>
        <span className="text-xs text-muted">{fixture.round || 'Group Stage'}</span>
        <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
          {isMyGame && <span className="badge badge-gold" style={{ fontSize: '0.5rem' }}>MY TEAM</span>}
          {isLive && <span className="badge badge-live" style={{ fontSize: '0.5rem' }}>LIVE {fixture.elapsed ? `${fixture.elapsed}'` : ''}</span>}
        </div>
      </div>

      <div className="fixture-teams">
        <div className="fixture-team">
          <span style={{ fontSize: '1.5rem' }}>🏳️</span>
          <span className="team-name">{fixture.home_team_name || `Team ${homeId}`}</span>
        </div>

        <div style={{ textAlign: 'center' }}>
          {hasScore ? (
            <div className="fixture-score" style={{ color: isLive ? 'var(--danger)' : 'var(--text)' }}>
              {fixture.home_goals} – {fixture.away_goals}
            </div>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 700 }}>
                {formatTime(kickoff)}
              </div>
              <div style={{ fontSize: '0.5625rem', color: 'var(--muted)' }}>vs</div>
            </div>
          )}
          {fixture.status_short && !isLive && (
            <div className="text-xs text-muted" style={{ marginTop: '0.125rem' }}>
              {fixture.status_long || fixture.status_short}
            </div>
          )}
        </div>

        <div className="fixture-team">
          <span style={{ fontSize: '1.5rem' }}>🏳️</span>
          <span className="team-name">{fixture.away_team_name || `Team ${awayId}`}</span>
        </div>
      </div>
    </div>
  )
}
