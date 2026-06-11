import React from 'react';

function eventIcon(type, detail) {
  const t = (type || '').toLowerCase();
  const d = (detail || '').toLowerCase();
  if (t === 'goal') return d.includes('own') ? '⚽(OG)' : '⚽';
  if (t === 'card') {
    if (d.includes('yellow')) return '🟨';
    if (d.includes('red')) return '🟥';
  }
  if (t === 'subst') return '🔁';
  return '📋';
}

export default function EventTicker({ events, myPlayerApiIds, myTeamApiIds }) {
  if (!events || events.length === 0) {
    return (
      <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', padding: '8px 0' }}>
        No events yet.
      </div>
    );
  }

  return (
    <div className="event-ticker">
      {events.map((event, idx) => {
        const isMyPlayer = myPlayerApiIds && myPlayerApiIds.includes(event.player_api_id);
        const isMyTeam = myTeamApiIds && myTeamApiIds.includes(event.team_api_id);
        const highlight = isMyPlayer || isMyTeam;

        return (
          <div key={event.id || idx} className={`event-item${highlight ? ' highlight' : ''}`}>
            <span className="event-minute">{event.minute ? `${event.minute}'` : '-'}</span>
            <span style={{ flexShrink: 0 }}>{eventIcon(event.type, event.detail)}</span>
            <span style={{ flex: 1, fontSize: '0.82rem' }}>
              {event.player_name || event.player_api_id || '—'}
            </span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
              {event.team_name || ''}
            </span>
          </div>
        );
      })}
    </div>
  );
}
