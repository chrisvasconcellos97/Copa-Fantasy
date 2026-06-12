import React from 'react';

function formatTime(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export default function FixtureCard({ fixture, myTeamApiIds = [], isLive }) {
  const homeIsMyTeam = myTeamApiIds.includes(fixture.home_team_api_id);
  const awayIsMyTeam = myTeamApiIds.includes(fixture.away_team_api_id);
  const isMyMatch = homeIsMyTeam || awayIsMyTeam;

  const hasScore =
    fixture.home_goals !== null && fixture.home_goals !== undefined &&
    fixture.away_goals !== null && fixture.away_goals !== undefined;

  return (
    <div
      className="card"
      style={{
        border: `1px solid ${isMyMatch ? 'var(--gold)' : 'var(--border)'}`,
        boxShadow: isMyMatch ? '0 0 12px rgba(255,215,0,0.15)' : 'none',
        padding: '14px 16px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Live badge */}
        {isLive && (
          <span
            className="badge"
            style={{
              background: 'rgba(239,68,68,0.15)',
              color: 'var(--danger)',
              animation: 'pulse 1.5s ease-in-out infinite',
              fontSize: '0.7rem',
              marginRight: 4,
            }}
          >
            ● LIVE
          </span>
        )}

        {/* Home team */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            justifyContent: 'flex-end',
            fontWeight: homeIsMyTeam ? 700 : 500,
            color: homeIsMyTeam ? 'var(--gold)' : 'var(--text)',
          }}
        >
          <span style={{ fontSize: '0.9rem', textAlign: 'right' }}>
            {fixture.home_team_name || fixture.home_team_api_id}
          </span>
          {fixture.home_logo_url && (
            <img
              src={fixture.home_logo_url}
              alt=""
              style={{ width: 28, height: 28, objectFit: 'contain', flexShrink: 0 }}
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          )}
        </div>

        {/* Score / time */}
        <div
          style={{
            minWidth: 72,
            textAlign: 'center',
            flexShrink: 0,
          }}
        >
          {hasScore ? (
            <span
              style={{
                fontWeight: 800,
                fontSize: '1.2rem',
                color: isLive ? 'var(--danger)' : 'var(--text)',
                letterSpacing: '0.05em',
              }}
            >
              {fixture.home_goals} – {fixture.away_goals}
            </span>
          ) : (
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              {formatTime(fixture.kickoff) || 'TBD'}
            </span>
          )}
          {isLive && (fixture.elapsed || fixture.status_short) && (
            <div style={{ fontSize: '0.7rem', color: 'var(--danger)', marginTop: 2, fontWeight: 700 }}>
              {fixture.elapsed ? `${fixture.elapsed}'` : fixture.status_short}
            </div>
          )}
        </div>

        {/* Away team */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontWeight: awayIsMyTeam ? 700 : 500,
            color: awayIsMyTeam ? 'var(--gold)' : 'var(--text)',
          }}
        >
          {fixture.away_logo_url && (
            <img
              src={fixture.away_logo_url}
              alt=""
              style={{ width: 28, height: 28, objectFit: 'contain', flexShrink: 0 }}
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          )}
          <span style={{ fontSize: '0.9rem' }}>
            {fixture.away_team_name || fixture.away_team_api_id}
          </span>
        </div>
      </div>
    </div>
  );
}
