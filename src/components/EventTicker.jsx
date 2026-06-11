import React from 'react';

function eventIcon(type, detail) {
  const t = type?.toLowerCase() || '';
  const d = detail?.toLowerCase() || '';
  if (t === 'goal' || t === 'goal scored') return '⚽';
  if (t === 'card' && d.includes('yellow')) return '🟨';
  if (t === 'card' && d.includes('red')) return '🟥';
  if (t === 'subst' || t === 'substitution') return '🔁';
  if (t === 'assist') return '🅰️';
  return '•';
}

export default function EventTicker({ events = [], myPlayerApiIds = [], myTeamApiIds = [] }) {
  if (!events || events.length === 0) {
    return (
      <div className="empty-state" style={{ padding: '20px' }}>
        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>No events yet</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 220, overflowY: 'auto' }}>
      {events.map(ev => {
        const isMyPlayer = ev.player_api_id && myPlayerApiIds.includes(ev.player_api_id);
        const isMyTeam = ev.team_api_id && myTeamApiIds.includes(ev.team_api_id);
        const highlight = isMyPlayer || isMyTeam;
        return (
          <div
            key={ev.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '5px 8px',
              borderRadius: 6,
              background: highlight ? 'rgba(255,215,0,0.08)' : 'transparent',
              border: highlight ? '1px solid rgba(255,215,0,0.2)' : '1px solid transparent',
            }}
          >
            <span style={{ fontSize: 14 }}>{eventIcon(ev.type, ev.detail)}</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 28 }}>{ev.minute}'</span>
            <span style={{ fontSize: 12, fontWeight: highlight ? 700 : 400, color: highlight ? 'var(--gold)' : 'var(--text)', flex: 1 }}>
              {ev.detail || ev.type}
            </span>
          </div>
        );
      })}
    </div>
  );
}
