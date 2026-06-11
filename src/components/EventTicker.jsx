import React from 'react';

const EVENT_ICONS = {
  goal: '⚽',
  subst: '🔁',
  substitution: '🔁',
  card: (detail) => {
    const d = (detail || '').toLowerCase();
    if (d.includes('red') || d.includes('second yellow')) return '🟥';
    return '🟨';
  },
  var: '📺',
};

function getIcon(type, detail) {
  const t = (type || '').toLowerCase();
  if (t === 'card') return EVENT_ICONS.card(detail);
  return EVENT_ICONS[t] || '•';
}

export default function EventTicker({ events, myPlayerApiIds = [], myTeamApiIds = [] }) {
  if (!events || events.length === 0) {
    return <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', padding: '8px 0' }}>No events yet.</div>;
  }

  const sorted = [...events].sort((a, b) => (a.minute || 0) - (b.minute || 0));

  return (
    <div className="event-ticker">
      {sorted.map((event) => {
        const isMine =
          myPlayerApiIds.includes(event.player_api_id) ||
          myTeamApiIds.includes(event.team_api_id);

        return (
          <div key={event.id} className={`event-item${isMine ? ' my-event' : ''}`}>
            <span className="event-minute">{event.minute ? `${event.minute}'` : '-'}</span>
            <span>{getIcon(event.type, event.detail)}</span>
            <span style={{ flex: 1 }}>
              {event.player_name || event.player_api_id || ''}
              {event.detail ? ` (${event.detail})` : ''}
            </span>
          </div>
        );
      })}
    </div>
  );
}
