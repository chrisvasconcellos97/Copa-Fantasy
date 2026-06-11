import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import FixtureCard from '../components/FixtureCard';
import EventTicker from '../components/EventTicker';

function groupByDate(fixtures) {
  const groups = {};
  for (const f of fixtures) {
    const date = f.kickoff_at
      ? new Date(f.kickoff_at).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
      : 'TBD';
    if (!groups[date]) groups[date] = [];
    groups[date].push(f);
  }
  return groups;
}

export default function MatchCenterView() {
  const [fixtures, setFixtures] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedFixture, setExpandedFixture] = useState(null);

  const myPlayerId = localStorage.getItem('copa_player_id');
  const gameId = localStorage.getItem('copa_game_id');

  const [myTeamApiIds, setMyTeamApiIds] = useState([]);
  const [myPlayerApiIds, setMyPlayerApiIds] = useState([]);

  useEffect(() => {
    async function loadUserContext() {
      if (!myPlayerId || !gameId) return;
      const { data: draftPicks } = await supabase
        .from('draft_picks')
        .select('team_api_id')
        .eq('game_id', gameId)
        .eq('game_player_id', myPlayerId);
      setMyTeamApiIds((draftPicks || []).map((p) => p.team_api_id));

      const { data: playerPicks } = await supabase
        .from('player_picks')
        .select('player_api_id')
        .eq('game_id', gameId)
        .eq('game_player_id', myPlayerId);
      setMyPlayerApiIds((playerPicks || []).map((p) => p.player_api_id));
    }
    loadUserContext();
  }, [myPlayerId, gameId]);

  useEffect(() => {
    async function loadFixtures() {
      const { data } = await supabase
        .from('fixtures')
        .select('*')
        .order('kickoff_at', { ascending: true });
      setFixtures(data || []);
      setLoading(false);
    }
    loadFixtures();

    const sub = supabase.channel('fixtures-live')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'fixtures' }, (payload) => {
        setFixtures((prev) => prev.map((f) => f.id === payload.new.id ? payload.new : f));
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'fixtures' }, (payload) => {
        setFixtures((prev) => [...prev, payload.new]);
      })
      .subscribe();

    return () => supabase.removeChannel(sub);
  }, []);

  useEffect(() => {
    async function loadEvents() {
      const liveIds = fixtures
        .filter((f) => f.status === '1H' || f.status === '2H' || f.status === 'HT' || f.status === 'ET')
        .map((f) => f.api_id);
      if (!liveIds.length) { setEvents([]); return; }

      const { data } = await supabase
        .from('match_events')
        .select('*')
        .in('fixture_api_id', liveIds)
        .order('minute', { ascending: true });
      setEvents(data || []);
    }

    if (fixtures.length) loadEvents();

    const sub = supabase.channel('match-events-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'match_events' }, (payload) => {
        setEvents((prev) => [...prev, payload.new]);
      })
      .subscribe();

    return () => supabase.removeChannel(sub);
  }, [fixtures]);

  const liveFixtures = fixtures.filter((f) => ['1H', '2H', 'HT', 'ET', 'LIVE'].includes(f.status));
  const grouped = groupByDate(fixtures.filter((f) => !['1H', '2H', 'HT', 'ET', 'LIVE'].includes(f.status)));

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p>Loading matches…</p>
      </div>
    );
  }

  return (
    <div className="view">
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: '1.3rem', fontWeight: 800 }}>Match Center</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>World Cup 2026</p>
      </div>

      {liveFixtures.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div className="section-header" style={{ color: '#22c55e' }}>🔴 LIVE</div>
          {liveFixtures.map((f) => (
            <div key={f.id}>
              <FixtureCard
                fixture={f}
                myTeamApiIds={myTeamApiIds}
                isLive
              />
              {expandedFixture === f.id ? (
                <div>
                  <EventTicker
                    events={events.filter((e) => String(e.fixture_api_id) === String(f.api_id))}
                    myPlayerApiIds={myPlayerApiIds}
                    myTeamApiIds={myTeamApiIds}
                  />
                  <button
                    style={{ width: '100%', padding: '6px', fontSize: '0.8rem', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 8 }}
                    onClick={() => setExpandedFixture(null)}
                  >
                    ▲ Hide events
                  </button>
                </div>
              ) : (
                <button
                  style={{ width: '100%', padding: '6px', fontSize: '0.8rem', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 8 }}
                  onClick={() => setExpandedFixture(f.id)}
                >
                  ▼ Show events
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {fixtures.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize: '2rem', marginBottom: 8 }}>📅</div>
          <p>No fixtures loaded yet.</p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: 6 }}>
            Run the backfill script to populate matches.
          </p>
        </div>
      ) : (
        Object.entries(grouped).map(([date, dayFixtures]) => (
          <div key={date} style={{ marginBottom: 16 }}>
            <div className="section-header">{date}</div>
            {dayFixtures.map((f) => (
              <FixtureCard
                key={f.id}
                fixture={f}
                myTeamApiIds={myTeamApiIds}
                isLive={false}
              />
            ))}
          </div>
        ))
      )}
    </div>
  );
}
