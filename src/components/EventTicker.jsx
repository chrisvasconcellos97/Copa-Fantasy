import React from 'react';

const EVENT_ICONS = {
  goal: '⚽',
  card: '🟨',
  yellow_card: '🟨',
  red_card: '🟥',
  subst: '🔁',
  substitution: '🔁',
  var: '📺',
};

function getIcon(event) {
  const type = (event.type || '').toLowerCase();
  const detail = (event.detail || '').toLowerCase();
  if (type === 'card') {
    if (detail.includes('red') || detail.includes('second')) return '🟥';
    return '🟨';
  }
  return EVENT_ICONS[type] || '📋';
}

export default function EventTicker({ events, myPlayerApiIds = [], myTeamApiIds = [] }) {
  const myPlayers = new Set(myPlayerApiIds);
  const myTeams = new Set(myTeamApiIds);

  if (!events || events.length === 0) {
    return <p className="text-muted text-sm">No events yet.</p>;
  }

  return (
    <ul className="event-ticker">
      {events.map((event, idx) => {
        const isMine = myPlayers.has(event.player_api_id) || myTeams.has(event.team_api_id);
        return (
          <li key={event.id || idx} className={`event-ticker__item ${isMine ? 'event-ticker__item--mine' : ''}`}>
            <span>{getIcon(event)}</span>
            <span className="event-ticker__minute">{event.minute}&apos;</span>
            <span style={{ flex: 1 }}>{event.detail || event.type}</span>
          </li>
        );
      })}
    </ul>
  );
}
