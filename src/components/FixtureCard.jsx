import React from 'react';

function TeamSide({ teamApiId, score, teams, isMyTeam }) {
  const team = teams?.find(t => t.api_id === teamApiId);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1 }}>
      {team?.logo_url ? (
        <img src={team.logo_url} alt={team?.name} style={{ width: 36, height: 36, objectFit: 'contain' }} />
      ) : (
        <div style={{ width: 36, height: 36, background: 'var(--border)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>⚽</div>
      )}
      <span style={{ fontSize: 11, fontWeight: 600, textAlign: 'center', color: isMyTeam ? 'var(--gold)' : 'var(--text)', lineHeight: 1.3 }}>
        {team?.name || '—'}
      </span>
      <span style={{ fontSize: 22, fontWeight: 800, color: isMyTeam ? 'var(--gold)' : 'var(--text)' }}>
        {score ?? '—'}
      </span>
    </div>
  );
}

export default function FixtureCard({ fixture, myTeamApiIds = [], isLive, teams = [] }) {
  const homeIsMyTeam = myTeamApiIds.includes(fixture?.home_team_api_id);
  const awayIsMyTeam = myTeamApiIds.includes(fixture?.away_team_api_id);
  const isHighlighted = homeIsMyTeam || awayIsMyTeam;
  const kickoffDate = fixture?.kickoff_at ? new Date(fixture.kickoff_at) : null;

  return (
    <div style={{
      background: 'var(--card-bg)',
      border: `1px solid ${isHighlighted ? 'var(--gold)' : 'var(--border)'}`,
      borderRadius: 'var(--radius)',
      padding: '14px 16px',
      boxShadow: isHighlighted ? 'var(--shadow-gold)' : 'none',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <TeamSide
          teamApiId={fixture?.home_team_api_id}
          score={fixture?.home_score}
          teams={teams}
          isMyTeam={homeIsMyTeam}
        />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 60 }}>
          {isLive ? (
            <span className="badge badge-live" style={{ fontSize: 10, marginBottom: 2 }}>LIVE</span>
          ) : (
            fixture?.status === 'FT' ? (
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700 }}>FT</span>
            ) : (
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {kickoffDate ? kickoffDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'TBD'}
              </span>
            )
          )}
          <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 700 }}>vs</span>
        </div>
        <TeamSide
          teamApiId={fixture?.away_team_api_id}
          score={fixture?.away_score}
          teams={teams}
          isMyTeam={awayIsMyTeam}
        />
      </div>
    </div>
  );
}
