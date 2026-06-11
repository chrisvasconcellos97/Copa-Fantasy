export default function EventTicker({ events = [], myPlayerApiIds = [], myTeamApiIds = [] }) {
  const myPlayerIds = myPlayerApiIds.map(String);
  const myTeamIds = myTeamApiIds.map(String);

  function getIcon(type, detail) {
    const t = (type || '').toLowerCase();
    const d = (detail || '').toLowerCase();
    if (t === 'goal' || t === 'goal') return d === 'own goal' ? '⚽ OG' : '⚽';
    if (t === 'card' && d.includes('yellow')) return '🟨';
    if (t === 'card' && (d.includes('red') || d.includes('second'))) return '🟥';
    if (t === 'subst') return '🔁';
    if (t === 'var') return '📺';
    return '•';
  }

  if (events.length === 0) {
    return <div className="text-xs text-muted" style={{ padding: '0.5rem 0' }}>No events yet</div>;
  }

  return (
    <div className="event-ticker">
      {events.map((ev, i) => {
        const isMine =
          myPlayerIds.includes(String(ev.player_api_id)) ||
          myTeamIds.includes(String(ev.team_api_id));
        return (
          <div key={ev.id || i} className={`event-item ${isMine ? 'mine' : ''}`}>
            <span className="event-minute">{ev.minute}'</span>
            <span>{getIcon(ev.type, ev.detail)}</span>
            <span style={{ flex: 1 }}>
              {ev.player_name || `Player ${ev.player_api_id}`}
            </span>
            <span className="text-xs text-muted">{ev.team_name || ''}</span>
          </div>
        );
      })}
    </div>
  );
}
