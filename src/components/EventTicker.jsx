import React from 'react';

const EVENT_ICONS = {
  goal: '⚽',
  assist: '🅰️',
  yellow_card: '🟨',
  red_card: '🟥',
  substitution: '🔄',
  penalty: '⚽',
  own_goal: '🙈',
  var: '📺',
};

export default function EventTicker({ events = [], myPlayerApiIds = [], myTeamApiIds = [] }) {
  if (events.length === 0) {
    return <div className="text-muted text-sm text-center">No events yet</div>;
  }

  return (
    <div className="event-ticker">
      {events.map((ev, i) => {
        const isMine =
          myPlayerApiIds.includes(ev.player_api_id) ||
          myTeamApiIds.includes(ev.team_api_id);
        return (
          <div key={ev.id || i} className={`event-item${isMine ? ' mine' : ''}`}>
            <span className="event-minute">{ev.elapsed}'</span>
            <span className="event-icon">{EVENT_ICONS[ev.type] || '•'}</span>
            <div style={{ flex: 1 }}>
              <div className="event-player">{ev.player_name}</div>
              <div className="text-xs text-muted">{ev.team_name} · {ev.type?.replace('_', ' ')}</div>
            </div>
            {isMine && <span className="tag tag-green" style={{ fontSize: 9 }}>+pts</span>}
          </div>
        );
      })}
    </div>
  );
}
