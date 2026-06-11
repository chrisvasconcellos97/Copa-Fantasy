import React from 'react'

const EVENT_ICONS = {
  Goal: '⚽',
  Card: '🟨',
  subst: '🔄',
  Var: '📺',
  default: '•',
}

function getIcon(type, detail) {
  if (type === 'Goal') return detail === 'Own Goal' ? '😬' : '⚽'
  if (type === 'Card') return detail === 'Red Card' ? '🟥' : '🟨'
  return EVENT_ICONS[type] || EVENT_ICONS.default
}

export default function EventTicker({ events = [], myPlayerApiIds = [], myTeamApiIds = [] }) {
  if (!events.length) {
    return <div className="empty-state"><div className="text-sm">No events yet</div></div>
  }

  return (
    <div className="event-ticker">
      {events.map((ev, idx) => {
        const isMine = myPlayerApiIds.includes(ev.player_api_id) || myPlayerApiIds.includes(ev.assist_api_id)
        const isMyTeam = myTeamApiIds.includes(ev.team_api_id)
        return (
          <div key={ev.id || idx} className={`event-item${isMine ? ' mine' : ''}`}>
            <span className="event-min">{ev.elapsed}'</span>
            <span>{getIcon(ev.type, ev.detail)}</span>
            <span style={{ flex: 1, fontSize: '0.75rem' }}>
              <strong>{ev.player_name || `#${ev.player_api_id}`}</strong>
              {ev.assist_api_id && (
                <span className="text-muted"> (assist: {ev.assist_name || `#${ev.assist_api_id}`})</span>
              )}
              <span className="text-muted"> · {ev.detail || ev.type}</span>
            </span>
            {isMyTeam && !isMine && (
              <span className="badge badge-navy" style={{ fontSize: '0.5rem' }}>MY</span>
            )}
          </div>
        )
      })}
    </div>
  )
}
