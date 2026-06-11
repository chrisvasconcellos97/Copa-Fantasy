import React from 'react';

const EVENT_ICONS = {
  Goal: '⚽',
  Var: '📺',
  Card: '🟨',
  subst: '🔄',
  Penalty: '🎯',
  'Own Goal': '😬',
};

function getIcon(event) {
  if (event.detail === 'Own Goal') return '😬';
  if (event.detail === 'Red Card') return '🟥';
  if (event.detail === 'Yellow Card') return '🟨';
  return EVENT_ICONS[event.type] || '📋';
}

export default function EventTicker({ events = [], myPlayerApiIds = [], myTeamApiIds = [] }) {
  if (events.length === 0) {
    return <div className="empty-state"><div>No events yet</div></div>;
  }

  return (
    <div className="event-ticker">
      {[...events].reverse().map((ev, i) => {
        const mine = myPlayerApiIds.includes(ev.player_api_id) || myTeamApiIds.includes(ev.team_api_id);
        return (
          <div key={ev.id || i} className={`event-item${mine ? ' event-item--mine' : ''}`}>
            <span className="event-item__elapsed">{ev.elapsed}'</span>
            <span className="event-item__icon">{getIcon(ev)}</span>
            <span className="event-item__text">
              {ev.player_name || ev.player_api_id}
              {ev.type === 'Goal' && ' scored'}
              {ev.detail === 'Yellow Card' && ' yellow card'}
              {ev.detail === 'Red Card' && ' red card'}
              {ev.type === 'subst' && ' substituted'}
            </span>
          </div>
        );
      })}
    </div>
  );
}
