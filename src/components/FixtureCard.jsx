import React from 'react';

/**
 * FixtureCard – home logo + score + away logo.
 *
 * Props:
 *   fixture       { id, home_team_api_id, away_team_api_id, home_score, away_score, status, kickoff_at }
 *   myTeamApiIds  Set<string> or Array<string>
 *   isLive        boolean
 *   homeTeam      { name, logo_url }
 *   awayTeam      { name, logo_url }
 */
export default function FixtureCard({ fixture, myTeamApiIds = [], isLive, homeTeam, awayTeam }) {
  if (!fixture) return null;

  const myIds = new Set(Array.isArray(myTeamApiIds) ? myTeamApiIds : [...myTeamApiIds]);
  const homeIsMyTeam = myIds.has(fixture.home_team_api_id);
  const awayIsMyTeam = myIds.has(fixture.away_team_api_id);
  const isMyFixture = homeIsMyTeam || awayIsMyTeam;

  const kickoff = fixture.kickoff_at ? new Date(fixture.kickoff_at) : null;
  const timeStr = kickoff
    ? kickoff.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '--:--';
  const dateStr = kickoff
    ? kickoff.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
    : '';

  const hasScore = fixture.home_score != null && fixture.away_score != null;
  const statusUpper = (fixture.status || '').toUpperCase();
  const isFinished = statusUpper === 'FT' || statusUpper === 'FINISHED' || statusUpper === 'FULL_TIME';
  const isScheduled = statusUpper === 'NS' || statusUpper === 'SCHEDULED' || statusUpper === 'TBD' || !hasScore;

  return (
    <div className={`fixture-card${isMyFixture ? ' fixture-card--mine' : ''}${isLive ? ' fixture-card--live' : ''}`}>
      {isLive && <span className="badge badge-live fixture-card__live-badge">● LIVE</span>}
      {isFinished && <span className="badge badge-muted fixture-card__status-badge">FT</span>}

      <p className="fixture-card__date">{dateStr} {isScheduled ? timeStr : ''}</p>

      <div className="fixture-card__body">
        <div className={`fixture-card__team${homeIsMyTeam ? ' fixture-card__team--mine' : ''}`}>
          <TeamLogo team={homeTeam} id={fixture.home_team_api_id} />
          <span className="fixture-card__team-name">{homeTeam?.name || 'TBD'}</span>
        </div>

        <div className="fixture-card__score-block">
          {hasScore ? (
            <span className="fixture-card__score">
              {fixture.home_score} – {fixture.away_score}
            </span>
          ) : (
            <span className="fixture-card__vs">vs</span>
          )}
        </div>

        <div className={`fixture-card__team fixture-card__team--away${awayIsMyTeam ? ' fixture-card__team--mine' : ''}`}>
          <TeamLogo team={awayTeam} id={fixture.away_team_api_id} />
          <span className="fixture-card__team-name">{awayTeam?.name || 'TBD'}</span>
        </div>
      </div>

      <style>{`
        .fixture-card {
          background: var(--card-bg);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 0.85rem 1rem;
          position: relative;
          transition: border-color 0.18s ease;
        }
        .fixture-card--mine {
          border-color: rgba(255,215,0,0.4);
          background: rgba(255,215,0,0.03);
        }
        .fixture-card--live {
          border-color: var(--live);
        }
        .fixture-card__live-badge {
          position: absolute;
          top: 0.5rem;
          right: 0.5rem;
        }
        .fixture-card__status-badge {
          position: absolute;
          top: 0.5rem;
          right: 0.5rem;
        }
        .fixture-card__date {
          font-size: 0.7rem;
          color: var(--text-muted);
          margin-bottom: 0.5rem;
        }
        .fixture-card__body {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.5rem;
        }
        .fixture-card__team {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.3rem;
          flex: 1;
        }
        .fixture-card__team--mine .fixture-card__team-name {
          color: var(--gold);
          font-weight: 700;
        }
        .fixture-card__team--away {
          align-items: center;
        }
        .fixture-card__team-name {
          font-size: 0.72rem;
          font-weight: 600;
          text-align: center;
          color: var(--text);
          max-width: 80px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .fixture-card__score-block {
          flex-shrink: 0;
          min-width: 60px;
          text-align: center;
        }
        .fixture-card__score {
          font-size: 1.3rem;
          font-weight: 800;
          color: var(--text);
          letter-spacing: 0.02em;
        }
        .fixture-card__vs {
          font-size: 1rem;
          color: var(--text-muted);
          font-weight: 600;
        }
        .fc-logo {
          width: 40px;
          height: 40px;
          object-fit: contain;
        }
        .fc-logo-fallback {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: var(--border);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1rem;
          font-weight: 700;
          color: var(--text-muted);
        }
      `}</style>
    </div>
  );
}

function TeamLogo({ team, id }) {
  if (team?.logo_url) {
    return <img src={team.logo_url} alt={team?.name || id} className="fc-logo" onError={(e) => { e.target.style.display='none'; }} />;
  }
  return <div className="fc-logo-fallback">{team?.name?.[0] || '?'}</div>;
}
