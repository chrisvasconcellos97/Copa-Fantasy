export default function SquadBuilder({ picks, teams }) {
  const teamsById = Object.fromEntries((teams || []).map(t => [t.api_id, t]))
  return (
    <div className="squad-builder">
      {(picks || []).map(pick => {
        const team = teamsById[pick.team_api_id]
        if (!team) return null
        return (
          <div key={pick.id} className="squad-team-block">
            <div className="squad-team-header">
              {team.logo_url && <img src={team.logo_url} alt={team.name} className="squad-logo" />}
              <span>{team.name}</span>
            </div>
            <div className="squad-slots">
              <div className="squad-slot fwd">FWD</div>
              <div className="squad-slot mid">MID</div>
              <div className="squad-slot def">DEF</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
