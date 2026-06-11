import React from 'react'

export default function HostDashboard({ players = [], picks = [], currentPicker, onPoke, teams = [] }) {
  const teamMap = {}
  teams.forEach((t) => { teamMap[t.api_id] = t })

  const picksByPlayer = {}
  picks.forEach((pick) => {
    if (!picksByPlayer[pick.player_id]) picksByPlayer[pick.player_id] = []
    picksByPlayer[pick.player_id].push(pick)
  })

  const totalPicks = players.length * 8
  const progress = totalPicks > 0 ? (picks.length / totalPicks) * 100 : 0

  return (
    <div style={{ padding: '1rem' }}>
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-semibold">Draft Progress</span>
          <span className="text-sm text-muted">{picks.length}/{totalPicks}</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {players.map((player) => {
          const isCurrent = currentPicker && currentPicker.id === player.id
          const playerPicks = picksByPlayer[player.id] || []
          return (
            <div key={player.id} className={`host-player-row${isCurrent ? ' current' : ''}`}>
              <div style={{ flex: 1 }}>
                <div className="flex items-center gap-2">
                  <span className={`font-semibold text-sm${isCurrent ? ' text-gold' : ''}`}>
                    {player.name}
                  </span>
                  {isCurrent && (
                    <span className="badge badge-gold" style={{ fontSize: '0.5rem' }}>PICKING</span>
                  )}
                </div>
                <div className="text-xs text-muted mt-1">
                  {playerPicks.length} teams picked
                </div>
              </div>
              {isCurrent && onPoke && (
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => onPoke(player)}
                  style={{ fontSize: '0.75rem' }}
                >
                  👋 Poke
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
