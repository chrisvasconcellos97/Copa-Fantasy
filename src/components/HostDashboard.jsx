export default function HostDashboard({ players, picks, currentPicker, onPoke, teams }) {
  const teamsById = Object.fromEntries((teams || []).map(t => [t.api_id, t]))
  return (
    <div className="host-dashboard">
      <h3>Draft Progress</h3>
      <div className="host-players-list">
        {(players || []).map(p => {
          const myPicks = (picks || []).filter(pk => pk.player_id === p.id)
          const isCurrent = currentPicker && currentPicker.id === p.id
          return (
            <div key={p.id} className={'host-player-row' + (isCurrent ? ' current' : '')}>
              <div className="host-player-info">
                <span className="host-player-name">{p.name}</span>
                <span className="host-pick-count">{myPicks.length} picks</span>
              </div>
              <div className="host-player-picks">
                {myPicks.map(pk => {
                  const t = teamsById[pk.team_api_id]
                  return t ? <span key={pk.id} className="host-pick-chip">{t.name}</span> : null
                })}
              </div>
              {isCurrent && onPoke && (
                <button className="btn-sm btn-gold" onClick={() => onPoke(p.id)}>Poke</button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
