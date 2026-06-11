import React from 'react';

function getIcon(type, detail) {
  if (type === 'Goal') return detail === 'Own Goal' ? '😬⚽' : '⚽';
  if (type === 'Card') return detail === 'Red Card' ? '🟥' : '🟨';
  if (type === 'subst' || type === 'Substitution') return '🔁';
  if (type === 'Var') return '📺';
  return '•';
}

export default function EventTicker({ events = [], myPlayerApiIds = [], myTeamApiIds = [] }) {
  if (!events.length) {
    return (
      <div className="empty-state">
        <div className="text-sm">No events yet</div>
      </div>
    );
  }

  return (
    <div className="event-ticker">
      {events.map((ev, idx) => {
        const isMine =
          myPlayerApiIds.map(String).includes(String(ev.player_api_id)) ||
          myPlayerApiIds.map(String).includes(String(ev.assist_player_api_id));
        const isMyTeam = myTeamApiIds.map(String).includes(String(ev.team_api_id));

        return (
          <div key={ev.id || idx} className={'event-item' + (isMine ? ' mine' : '')}>
            <span className="event-min">{ev.minute}'</span>
            <span>{getIcon(ev.type, ev.detail)}</span>
            <span style={{ flex: 1, fontSize: '0.78rem' }}>
              <strong>{ev.player_name || `#${ev.player_api_id}`}</strong>
              {ev.detail && (
                <span style={{ color: 'var(--text-muted)' }}> · {ev.detail}</span>
              )}
            </span>
            {isMyTeam && !isMine && (
              <span style={{
                background: 'rgba(255,215,0,0.15)', color: 'var(--gold)',
                fontSize: '0.65rem', fontWeight: 700,
                padding: '1px 5px', borderRadius: 999,
              }}>MY TEAM</span>
            )}
            {isMine && (
              <span style={{
                background: 'rgba(255,215,0,0.25)', color: 'var(--gold)',
                fontSize: '0.65rem', fontWeight: 700,
                padding: '1px 5px', borderRadius: 999,
              }}>MY PLAYER</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
