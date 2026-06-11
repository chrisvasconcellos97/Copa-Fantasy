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

function getIcon(type, detail) {
  const t = (type || '').toLowerCase();
  const d = (detail || '').toLowerCase();
  if (t === 'card') {
    if (d.includes('red') || d.includes('second yellow')) return '🟥';
    return '🟨';
  }
  return EVENT_ICONS[t] || '📋';
}

/**
 * EventTicker – scrollable list of match events.
 *
 * Props:
 *   events          Array<{id, type, detail, minute, player_api_id, team_api_id, player_name, team_name}>
 *   myPlayerApiIds  Array<string>
 *   myTeamApiIds    Array<string>
 */
export default function EventTicker({ events = [], myPlayerApiIds = [], myTeamApiIds = [] }) {
  const myPlayers = new Set(myPlayerApiIds);
  const myTeams = new Set(myTeamApiIds);

  if (events.length === 0) {
    return <p className="text-muted text-sm" style={{ padding: '0.5rem 0' }}>No events yet.</p>;
  }

  const sorted = [...events].sort((a, b) => (a.minute || 0) - (b.minute || 0));

  return (
    <div className="event-ticker">
      {sorted.map((ev) => {
        const isMyPlayer = myPlayers.has(ev.player_api_id);
        const isMyTeam = myTeams.has(ev.team_api_id);
        const highlight = isMyPlayer || isMyTeam;
        const icon = getIcon(ev.type, ev.detail);

        return (
          <div key={ev.id} className={`event-row${highlight ? ' event-row--mine' : ''}`}>
            <span className="event-row__min">{ev.minute ?? '?'}'</span>
            <span className="event-row__icon">{icon}</span>
            <span className="event-row__name">{ev.player_name || ev.player_api_id || '—'}</span>
            {ev.detail && <span className="event-row__detail">({ev.detail})</span>}
            {ev.team_name && <span className="event-row__team">{ev.team_name}</span>}
          </div>
        );
      })}

      <style>{`
        .event-ticker {
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
          max-height: 300px;
          overflow-y: auto;
        }
        .event-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.3rem 0.5rem;
          border-radius: var(--radius-sm);
          font-size: 0.82rem;
          transition: background 0.15s;
        }
        .event-row:hover { background: #0e0e16; }
        .event-row--mine {
          background: rgba(255,215,0,0.06);
          border-left: 3px solid var(--gold);
          padding-left: 0.4rem;
        }
        .event-row--mine .event-row__name { color: var(--gold); font-weight: 700; }
        .event-row__min {
          font-size: 0.75rem;
          color: var(--text-muted);
          min-width: 28px;
          font-weight: 600;
        }
        .event-row__icon { font-size: 0.9rem; flex-shrink: 0; }
        .event-row__name { font-weight: 600; flex: 1; }
        .event-row__detail {
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        .event-row__team {
          font-size: 0.72rem;
          color: var(--text-dim);
          margin-left: auto;
        }
      `}</style>
    </div>
  );
}
