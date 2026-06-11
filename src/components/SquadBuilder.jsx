export default function SquadBuilder({ picks, teams }) {
  const teamPicks = picks.filter(p => p.pick_type === 'team');
  const playerPicks = picks.filter(p => p.pick_type === 'player');
  const totalPlayerSlots = 24;
  const filledPlayerSlots = playerPicks.length;

  return (
    <div className="squad-builder">
      <div className="progress-bar-wrap mb-2">
        <div className="flex" style={{justifyContent:'space-between', marginBottom:'4px'}}>
          <span className="text-sm text-muted">Players selected</span>
          <span className="text-sm text-gold">{filledPlayerSlots} / {totalPlayerSlots}</span>
        </div>
        <div className="progress-bar-bg">
          <div className="progress-bar-fill" style={{ width: `${(filledPlayerSlots / totalPlayerSlots) * 100}%` }} />
        </div>
      </div>
      <div className="squad-teams-grid">
        {Array.from({length:8}, (_, i) => {
          const tp = teamPicks[i];
          const team = tp ? teams.find(t => t.api_id === tp.team_api_id) : null;
          const tPlayers = tp ? playerPicks.filter(p => p.team_api_id === tp.team_api_id) : [];
          return (
            <div key={i} className="squad-team-slot card">
              <div className="squad-team-header">
                {team ? (
                  <>
                    {team.logo_url && <img src={team.logo_url} alt={team.name} width={24} height={24} />}
                    <span className="text-sm font-bold">{team.name}</span>
                  </>
                ) : (
                  <span className="text-muted text-sm">Team {i+1}</span>
                )}
              </div>
              <div className="squad-player-slots">
                {Array.from({length:3}, (_, j) => {
                  const pp = tPlayers[j];
                  return (
                    <div key={j} className={`squad-player-slot ${pp ? 'filled' : 'empty'}`}>
                      {pp ? <span className="text-sm">{pp.player_name || pp.player_api_id}</span>
                           : <span className="text-muted text-sm">Player {j+1}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
