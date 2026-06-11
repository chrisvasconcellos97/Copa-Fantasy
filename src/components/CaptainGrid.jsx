export default function CaptainGrid({ playerPicks, captainPickId, onSelectCaptain, teams }) {
  const teamPicks = (playerPicks || []).filter(p => p.pick_type === 'team');

  return (
    <div className="captain-grid">
      <h3 className="text-gold mb-2">Select Your Captain Team</h3>
      <p className="text-muted text-sm mb-3">Your captain team's points will be doubled.</p>
      <div className="grid-4">
        {teamPicks.map(pick => {
          const team = teams.find(t => t.api_id === pick.team_api_id);
          const isCaptain = pick.id === captainPickId;
          if (!team) return null;
          return (
            <div
              key={pick.id}
              className={`captain-team-card card ${isCaptain ? 'selected' : ''}`}
              onClick={() => onSelectCaptain(pick.id)}
              role="button"
              tabIndex={0}
              onKeyDown={e => e.key === 'Enter' && onSelectCaptain(pick.id)}
            >
              <div className="captain-crown" style={{ visibility: isCaptain ? 'visible' : 'hidden' }}>👑</div>
              {team.logo_url ? (
                <img src={team.logo_url} alt={team.name} width={48} height={48} />
              ) : (
                <div className="team-logo-fallback">{team.name.slice(0,2).toUpperCase()}</div>
              )}
              <div className="text-sm font-bold mt-1">{team.name}</div>
              {isCaptain && <div className="text-gold text-sm">Captain ✓</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
