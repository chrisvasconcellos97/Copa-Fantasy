import React from 'react';

const EVENT_ICONS = {
  Goal: '⚽',
  Card: '🟨',
  subst: '🔄',
  Var: '📺',
};

function getIcon(event) {
  if (event.type === 'Goal') return event.detail === 'Own Goal' ? '🔴' : '⚽';
  if (event.type === 'Card') return event.detail === 'Red Card' ? '🟥' : '🟨';
  return EVENT_ICONS[event.type] || '•';
}

export default function EventTicker({ events, myPlayerApiIds = [], myTeamApiIds = [] }) {
  if (!events || events.length === 0) {
    return (
      <div className="ticker-wrap" style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '0.8rem', padding: '10px' }}>
        No events yet
      </div>
    );
  }

  // Duplicate for seamless loop
  const doubled = [...events, ...events];

  return (
    <div className="ticker-wrap">
      <div className="ticker-inner">
        {doubled.map((ev, i) => {
          const isMine = myPlayerApiIds.includes(ev.player_api_id) || myTeamApiIds.includes(ev.team_api_id);
          return (
            <span key={`${ev.id || i}-${i}`} className={`ticker-item${isMine ? ' ticker-item--mine' : ''}`}>
              {getIcon(ev)}
              <span>{ev.elapsed ? `${ev.elapsed}'` : ''}</span>
              <span>{ev.player_name || `P${ev.player_api_id}`}</span>
              <span style={{ color: 'var(--muted)' }}>({ev.team_name || `T${ev.team_api_id}`})</span>
              <span style={{ color: 'var(--line)', margin: '0 8px' }}>|</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
