const EVENT_ICONS = {
  goal: '⚽',
  card: '🟨',
  yellowcard: '🟨',
  redcard: '🟥',
  subst: '🔁',
  substitution: '🔁',
  var: '📺',
};

function getIcon(event) {
  const type = (event.type || '').toLowerCase();
  const detail = (event.detail || '').toLowerCase();
  if (type === 'card') {
    if (detail.includes('red') || detail.includes('second yellow')) return '🟥';
    return '🟨';
  }
  return EVENT_ICONS[type] || '📋';
}

export default function EventTicker({ events = [], myPlayerApiIds = [], myTeamApiIds = [] }) {
  const myPlayers = new Set(myPlayerApiIds);
  const myTeams = new Set(myTeamApiIds);

  if (events.length === 0) {
    return (
      <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '0.75rem' }}>
        No events yet.
      </div>
    );
  }

  const sorted = [...events].sort((a, b) => (b.minute || 0) - (a.minute || 0));

  return (
    <div className="event-ticker">
      {sorted.map((event) => {
        const isMine = myPlayers.has(event.player_api_id) || myTeams.has(event.team_api_id);
        return (
          <div key={event.id} className={`event-item${isMine ? ' event-item--mine' : ''}`}>
            <span className="event-item__minute">{event.minute}'</span>
            <span style={{ fontSize: '1rem' }}>{getIcon(event)}</span>
            <span style={{ flex: 1, fontSize: '0.83rem' }}>
              {event.player_name || event.player_api_id || '—'}
            </span>
            {event.detail && (
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{event.detail}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
