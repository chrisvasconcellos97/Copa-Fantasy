import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.js';

const TABS = [
  { key: 'goals', label: '⚽ Goals' },
  { key: 'assists', label: '🎯 Assists' },
  { key: 'clean_sheets', label: '🧤 Clean Sheets' },
  { key: 'cards', label: '🟨 Cards' },
];

export default function StatsView() {
  const [tab, setTab] = useState('goals');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ goals: [], assists: [], clean_sheets: [], cards: [] });

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [eventsRes, fixturesRes, playersRes, teamsRes] = await Promise.all([
        supabase.from('match_events').select('player_api_id, type, fixture_api_id'),
        supabase.from('fixtures').select('home_team_api_id, away_team_api_id, home_goals, away_goals').eq('status_short', 'FT'),
        supabase.from('players').select('api_id, name, team_api_id, position'),
        supabase.from('teams').select('api_id, name, logo_url'),
      ]);

      const events = eventsRes.data || [];
      const fixtures = fixturesRes.data || [];
      const players = playersRes.data || [];
      const teams = teamsRes.data || [];

      const playerMap = {};
      for (const p of players) playerMap[String(p.api_id)] = p;
      const teamMap = {};
      for (const t of teams) teamMap[String(t.api_id)] = t;

      function getPlayer(apiId) { return playerMap[String(apiId)]; }
      function getTeam(apiId) { return teamMap[String(apiId)]; }

      // Goals
      const goalCounts = {};
      for (const ev of events.filter(e => e.type === 'goal')) {
        const id = String(ev.player_api_id);
        goalCounts[id] = (goalCounts[id] || 0) + 1;
      }
      const goals = Object.entries(goalCounts)
        .map(([id, count]) => ({ player: getPlayer(id), team: getTeam(getPlayer(id)?.team_api_id), count }))
        .filter(r => r.player)
        .sort((a, b) => b.count - a.count)
        .slice(0, 20);

      // Assists
      const assistCounts = {};
      for (const ev of events.filter(e => e.type === 'assist')) {
        const id = String(ev.player_api_id);
        assistCounts[id] = (assistCounts[id] || 0) + 1;
      }
      const assists = Object.entries(assistCounts)
        .map(([id, count]) => ({ player: getPlayer(id), team: getTeam(getPlayer(id)?.team_api_id), count }))
        .filter(r => r.player)
        .sort((a, b) => b.count - a.count)
        .slice(0, 20);

      // Clean sheets — GKs only, per team that conceded 0
      const csTeamCounts = {};
      for (const fix of fixtures) {
        if (fix.away_goals === 0) csTeamCounts[String(fix.home_team_api_id)] = (csTeamCounts[String(fix.home_team_api_id)] || 0) + 1;
        if (fix.home_goals === 0) csTeamCounts[String(fix.away_team_api_id)] = (csTeamCounts[String(fix.away_team_api_id)] || 0) + 1;
      }
      const clean_sheets = Object.entries(csTeamCounts)
        .flatMap(([teamId, count]) => {
          const gks = players.filter(p => String(p.team_api_id) === teamId && p.position === 'GK');
          if (gks.length === 0) return [{ player: null, team: getTeam(teamId), count }];
          return gks.map(gk => ({ player: gk, team: getTeam(teamId), count }));
        })
        .filter(r => r.team)
        .sort((a, b) => b.count - a.count)
        .slice(0, 20);

      // Cards
      const cardCounts = {};
      for (const ev of events.filter(e => e.type === 'yellow_card' || e.type === 'red_card')) {
        const id = String(ev.player_api_id);
        if (!cardCounts[id]) cardCounts[id] = { yellow: 0, red: 0 };
        if (ev.type === 'yellow_card') cardCounts[id].yellow++;
        else cardCounts[id].red++;
      }
      const cards = Object.entries(cardCounts)
        .map(([id, c]) => ({ player: getPlayer(id), team: getTeam(getPlayer(id)?.team_api_id), yellow: c.yellow, red: c.red, total: c.yellow + c.red * 2 }))
        .filter(r => r.player)
        .sort((a, b) => b.total - a.total)
        .slice(0, 20);

      setStats({ goals, assists, clean_sheets, cards });
      setLoading(false);
    }
    load();
  }, []);

  function PlayerRow({ rank, player, team, right }) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 14px',
        background: rank === 1 ? 'rgba(255,215,0,0.06)' : 'var(--card-bg)',
        border: `1px solid ${rank === 1 ? 'rgba(255,215,0,0.3)' : 'var(--border)'}`,
        borderRadius: 'var(--radius)',
        marginBottom: 8,
      }}>
        <span style={{ width: 24, textAlign: 'center', fontWeight: 800, color: rank === 1 ? 'var(--gold)' : 'var(--text-muted)', fontSize: rank === 1 ? '1rem' : '0.85rem' }}>
          {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank}
        </span>
        {team?.logo_url && (
          <img src={team.logo_url} alt="" style={{ width: 24, height: 24, objectFit: 'contain', flexShrink: 0 }} onError={e => { e.target.style.display = 'none'; }} />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {player?.name || team?.name || 'Unknown'}
          </div>
          {team && player && (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{team.name}</div>
          )}
        </div>
        <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--gold)' }}>{right}</div>
      </div>
    );
  }

  const rows = {
    goals: stats.goals.map((r, i) => <PlayerRow key={i} rank={i + 1} player={r.player} team={r.team} right={r.count} />),
    assists: stats.assists.map((r, i) => <PlayerRow key={i} rank={i + 1} player={r.player} team={r.team} right={r.count} />),
    clean_sheets: stats.clean_sheets.map((r, i) => <PlayerRow key={i} rank={i + 1} player={r.player} team={r.team} right={r.count} />),
    cards: stats.cards.map((r, i) => (
      <PlayerRow
        key={i} rank={i + 1} player={r.player} team={r.team}
        right={
          <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {r.yellow > 0 && <span style={{ background: '#fbbf24', color: '#000', borderRadius: 3, padding: '1px 6px', fontSize: '0.8rem', fontWeight: 800 }}>{r.yellow}</span>}
            {r.red > 0 && <span style={{ background: '#ef4444', color: '#fff', borderRadius: 3, padding: '1px 6px', fontSize: '0.8rem', fontWeight: 800 }}>{r.red}</span>}
          </span>
        }
      />
    )),
  };

  return (
    <div className="page">
      <h1 className="page-title">Tournament Stats</h1>

      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="btn"
            style={{
              background: tab === t.key ? 'var(--gold)' : 'var(--card-bg)',
              color: tab === t.key ? '#0a0a0f' : 'var(--text-muted)',
              border: `1px solid ${tab === t.key ? 'var(--gold)' : 'var(--border)'}`,
              fontWeight: 700,
              fontSize: '0.85rem',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading"><div className="spinner" /></div>
      ) : rows[tab].length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon">📊</div>
          <div className="empty-state__text">No data yet</div>
        </div>
      ) : (
        <div>{rows[tab]}</div>
      )}
    </div>
  );
}
