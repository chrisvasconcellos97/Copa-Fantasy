import React, { useState, useEffect } from 'react';

const STAT_LABELS = {
  possessionPct: 'Possession',
  totalShots: 'Shots',
  shotsOnTarget: 'On Target',
  cornerKicks: 'Corners',
  fouls: 'Fouls',
  yellowCards: 'Yellow Cards',
  redCards: 'Red Cards',
  saves: 'Saves',
  offsides: 'Offsides',
};

const STAT_ORDER = ['possessionPct', 'totalShots', 'shotsOnTarget', 'cornerKicks', 'fouls', 'saves', 'offsides'];

function StatBar({ label, home, away }) {
  const h = parseFloat(home) || 0;
  const a = parseFloat(away) || 0;
  const total = h + a || 1;
  const homePct = Math.round((h / total) * 100);

  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: 4 }}>
        <span style={{ fontWeight: 700, color: 'var(--text)' }}>{h}{label === 'Possession' ? '%' : ''}</span>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>{label}</span>
        <span style={{ fontWeight: 700, color: 'var(--text)' }}>{a}{label === 'Possession' ? '%' : ''}</span>
      </div>
      <div style={{ display: 'flex', height: 4, borderRadius: 2, overflow: 'hidden', background: 'var(--border)' }}>
        <div style={{ width: `${homePct}%`, background: 'var(--gold)', transition: 'width 0.4s ease' }} />
        <div style={{ flex: 1, background: 'rgba(255,255,255,0.1)' }} />
      </div>
    </div>
  );
}

function eventIcon(type) {
  if (type === 'goal' || type === 'penalty-scored') return '⚽';
  if (type === 'own-goal') return '⚽🔃';
  if (type === 'yellow-card') return '🟨';
  if (type === 'red-card') return '🟥';
  if (type === 'yellow-red-card') return '🟨🟥';
  return '•';
}

function isLive(fixture) {
  if (fixture?.elapsed != null) return true;
  const s = fixture?.status_short || '';
  return ['1H', '2H', 'HT', 'ET', 'P', 'LIVE', 'in'].includes(s) || /^\d+'$/.test(s);
}

export default function MatchDetail({ fixture }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const live = isLive(fixture);

  useEffect(() => {
    if (!fixture?.api_id) return;
    let first = true;
    setLoading(true);
    setError(null);

    function load() {
      return fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/summary?event=${fixture.api_id}`)
      .then(r => r.json())
      .then(json => {
        const comp = json.header?.competitions?.[0];
        const boxscore = json.boxscore;
        const keyEvents = json.keyEvents || [];

        // Team stats
        const statsMap = { home: {}, away: {} };
        if (boxscore?.teams) {
          for (const team of boxscore.teams) {
            const side = team.homeAway;
            if (!statsMap[side]) continue;
            for (const group of (team.statistics || [])) {
              statsMap[side][group.name] = group.displayValue;
            }
          }
        }

        // Key events (goals, cards)
        const events = keyEvents
          .filter(e => ['goal', 'penalty-scored', 'own-goal', 'yellow-card', 'red-card', 'yellow-red-card'].includes(e.type?.id || e.type))
          .map(e => {
            const type = e.type?.id || e.type;
            const clock = e.clock?.displayValue || '';
            const minute = parseInt(clock) || null;
            const participants = e.participants || [];
            const scorer = participants[0]?.athlete?.displayName || null;
            const assister = participants[1]?.athlete?.displayName || null;
            const teamId = e.team?.id;
            const isHome = String(teamId) === String(fixture.home_team_api_id);
            return { type, minute, scorer, assister, isHome };
          })
          .sort((a, b) => (a.minute || 0) - (b.minute || 0));

        setData({ statsMap, events, comp });
        if (first) { setLoading(false); first = false; }
      })
      .catch(() => {
        if (first) { setError('Could not load match details'); setLoading(false); first = false; }
      });
    }

    load();
    // Poll every 60s while live so scorers update in real time
    if (live) {
      const interval = setInterval(load, 60_000);
      return () => clearInterval(interval);
    }
  }, [fixture?.api_id, live]);

  if (loading) return <div style={{ padding: '16px 0', textAlign: 'center' }}><div className="spinner" style={{ width: 20, height: 20 }} /></div>;
  if (error) return <div className="text-muted text-sm" style={{ padding: 12 }}>{error}</div>;
  if (!data) return null;

  const { statsMap, events } = data;
  const hasStats = Object.keys(statsMap.home).length > 0;

  return (
    <div style={{ padding: '4px 0' }}>
      {/* Key events */}
      {events.length > 0 && (
        <div style={{ marginBottom: hasStats ? 20 : 0 }}>
          {events.map((ev, i) => (
            <div key={i} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 0',
              borderBottom: i < events.length - 1 ? '1px solid var(--border)' : 'none',
              flexDirection: ev.isHome ? 'row' : 'row-reverse',
            }}>
              <span style={{ minWidth: 32, textAlign: ev.isHome ? 'left' : 'right', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>
                {ev.minute ? `${ev.minute}'` : ''}
              </span>
              <span style={{ fontSize: '0.95rem', flexShrink: 0 }}>{eventIcon(ev.type)}</span>
              <div style={{ flex: 1, textAlign: ev.isHome ? 'left' : 'right' }}>
                <div style={{ fontSize: '0.83rem', fontWeight: 600, color: 'var(--text)' }}>{ev.scorer || '—'}</div>
                {ev.assister && (
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>🎯 {ev.assister}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {events.length === 0 && !hasStats && (
        <div className="text-muted text-sm" style={{ padding: '12px 0', textAlign: 'center' }}>No events yet</div>
      )}

      {/* Team stats */}
      {hasStats && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            <span style={{ fontWeight: 700, color: 'var(--text)', fontSize: '0.78rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '40%' }}>
              {fixture.home_team_name}
            </span>
            <span>Stats</span>
            <span style={{ fontWeight: 700, color: 'var(--text)', fontSize: '0.78rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '40%', textAlign: 'right' }}>
              {fixture.away_team_name}
            </span>
          </div>
          {STAT_ORDER.map(key => {
            const homeVal = statsMap.home[key];
            const awayVal = statsMap.away[key];
            if (homeVal === undefined && awayVal === undefined) return null;
            return (
              <StatBar
                key={key}
                label={STAT_LABELS[key] || key}
                home={homeVal || '0'}
                away={awayVal || '0'}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
