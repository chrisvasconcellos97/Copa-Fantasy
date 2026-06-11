import React from 'react';

function eventIcon(type, detail) {
  const t = (type || '').toLowerCase();
  const d = (detail || '').toLowerCase();
  if (t === 'goal') return d === 'own goal' ? '⚽🔃' : '⚽';
  if (t === 'card') {
    if (d.includes('yellow')) return '🟨';
    if (d.includes('red') || d.includes('second yellow')) return '🟥';
    return '🟦';
  }
  if (t === 'subst') return '🔁';
  if (t === 'var') return '📺';
  return '📋';
}

export default function EventTicker({ events, myPlayerApiIds = [], myTeamApiIds = [] }) {
  if (!events || events.length === 0) {
    return (
      <div className="empty-state" style={{ padding: '24px 0' }}>
        <p className="text-muted text-sm">No events yet</p>
      </div>
    );
  }

  return (
    <div className="event-ticker">
      {[...events].reverse().map((event) => {
        const isMyPlayer = myPlayerApiIds.includes(event.player_api_id);
        const isMyTeam = myTeamApiIds.includes(event.team_api_id);
        const isHighlight = isMyPlayer || isMyTeam;
        return (
          <div key={event.id} className={`event-item${isHighlight ? ' my-event' : ''}`}>
            <span className="event-minute">{event.minute}&apos;</span>
            <span className="event-icon">{eventIcon(event.type, event.detail)}</span>
            <span className="event-name">{event.player_name || 'Unknown'}</span>
            <span className="event-detail">{event.detail}</span>
          </div>
        );
      })}
    </div>
  );
}
