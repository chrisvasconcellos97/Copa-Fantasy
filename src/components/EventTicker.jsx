import React from 'react';

const EVENT_ICONS = {
  Goal: '⚽',
  Card: (detail) => detail?.toLowerCase().includes('red') ? '🟥' : '🟨',
  subst: '🔁',
  Substitution: '🔁',
  Var: '📺',
  default: '•',
};

function getIcon(type, detail) {
  if (type === 'Card') return EVENT_ICONS.Card(detail);
  return EVENT_ICONS[type] || EVENT_ICONS.default;
}

export default function EventTicker({ events, myPlayerApiIds = [], myTeamApiIds = [] }) {
  if (!events || events.length === 0) {
    return (
      <div className="text-muted text-sm" style={{ padding: '12px 0' }}>
        No events yet
      </div>
    );
  }

  const sorted = [...events].sort((a, b) => (b.minute || 0) - (a.minute || 0));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {sorted.map((event) => {
        const isMyPlayer = myPlayerApiIds.includes(event.player_api_id);
        const isMyTeam = myTeamApiIds.includes(event.team_api_id);
        const isHighlighted = isMyPlayer || isMyTeam;

        return (
          <div
            key={event.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 12px',
              borderRadius: 'var(--radius-sm)',
              background: isHighlighted ? 'rgba(255,215,0,0.08)' : 'rgba(42,42,58,0.3)',
              border: `1px solid ${isHighlighted ? 'rgba(255,215,0,0.25)' : 'var(--border)'}`,
            }}
          >
            {/* Minute */}
            <span
              style={{
                fontSize: '0.78rem',
                fontWeight: 700,
                color: isHighlighted ? 'var(--gold)' : 'var(--text-muted)',
                minWidth: 32,
                textAlign: 'right',
              }}
            >
              {event.minute}&apos;
            </span>

            {/* Icon */}
            <span style={{ fontSize: '1rem', flexShrink: 0 }}>
              {getIcon(event.type, event.detail)}
            </span>

            {/* Description */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <span
                style={{
                  fontSize: '0.85rem',
                  fontWeight: isHighlighted ? 700 : 500,
                  color: isHighlighted ? 'var(--gold)' : 'var(--text)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  display: 'block',
                }}
              >
                {event.player_name || 'Player'}
              </span>
              {event.detail && (
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  {event.detail}
                </span>
              )}
            </div>

            {/* My pick marker */}
            {isMyPlayer && (
              <span
                className="badge"
                style={{
                  background: 'rgba(255,215,0,0.15)',
                  color: 'var(--gold)',
                  fontSize: '0.65rem',
                  flexShrink: 0,
                }}
              >
                MY PICK
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
