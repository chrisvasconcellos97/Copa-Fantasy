import React from 'react'

export default function CaptainGrid({ playerPicks = [], captainPickId, onSelectCaptain, players = [] }) {
  const playerMap = {}
  players.forEach((p) => { playerMap[p.api_id] = p })

  return (
    <div>
      <div className="section-label" style={{ padding: '0 1rem', marginBottom: '0.75rem' }}>
        Select Your Captain — 2× All Points
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(5rem, 1fr))', gap: '0.5rem', padding: '0 1rem' }}>
        {playerPicks.map((pp) => {
          const p = playerMap[pp.player_api_id] || {}
          const isSelected = captainPickId === pp.id
          return (
            <div
              key={pp.id}
              className={`captain-card${isSelected ? ' selected' : ''}`}
              onClick={() => onSelectCaptain && onSelectCaptain(pp)}
            >
              {isSelected && <div className="captain-badge">2×</div>}
              <img
                src={p.photo_url || 'https://media.api-sports.io/football/players/0.png'}
                alt={p.name}
                onError={(e) => { e.target.src = 'https://via.placeholder.com/48?text=?' }}
              />
              <div className="player-name">{p.name || `#${pp.player_api_id}`}</div>
              <div style={{ fontSize: '0.5625rem', color: 'var(--muted)', marginTop: '0.125rem' }}>
                {pp.position}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
