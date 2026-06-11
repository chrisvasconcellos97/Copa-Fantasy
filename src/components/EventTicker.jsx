import React from 'react';

function eventIcon(type, detail) {
  const t = (type || '').toLowerCase();
  const d = (detail || '').toLowerCase();
  if (t === 'goal') return '⚽';
  if (t === 'card') {
    if (d.includes('yellow')) return '🟨';
    if (d.includes('red')) return '🟥';
    return '🃏';
  }
  if (t === 'subst' || t === 'substitution') return '🔁';
  if (t === 'var') return '📺';
  return '•';
}

export default function EventTicker({ events, myPlayerApiIds, myTeamApiIds }) {
  if (!events || events.length === 0) {
    return <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', padding: 8 }}>No events yet</div>;
  }

  const sorted = [...events].sort((a, b) => (a.minute || 0) - (b.minute || 0));

  return (
    <div className="event-ticker">
      {sorted.map(event => {
        const isMinePlayer = myPlayerApiIds?.includes(event.player_api_id);
        const isMineTeam = myTeamApiIds?.includes(event.team_api_id);
        const isMine = isMinePlayer || isMineTeam;
        return (
          <div key={event.id} className={`event-item${isMine ? ' event-item--mine' : ''}`}>
            <span className="event-minute">{event.minute ? `${event.minute}'` : ''}</span>
            <span>{eventIcon(event.type, event.detail)}</span>
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
