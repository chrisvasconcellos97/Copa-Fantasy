import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.js';
import { getSession } from '../lib/session.js';
import FixtureCard from '../components/FixtureCard.jsx';
import EventTicker from '../components/EventTicker.jsx';

function groupByDate(fixtures) {
  const groups = {};
  fixtures.forEach((f) => {
    const date = f.kickoff_at
      ? new Date(f.kickoff_at).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
      : 'TBD';
    if (!groups[date]) groups[date] = [];
    groups[date].push(f);
  });
  return groups;
}

export default function MatchCenterView() {
  const session = getSession();
  const [fixtures, setFixtures] = useState([]);
  const [events, setEvents] = useState({});
  const [teams, setTeams] = useState([]);
  const [myTeamIds, setMyTeamIds] = useState([]);
  const [myPlayerIds, setMyPlayerIds] = useState([]);
  const [expandedFixture, setExpandedFixture] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [{ data: fixturesData }, { data: teamsData }] = await Promise.all([
        supabase.from('fixtures').select('*').order('kickoff_at', { ascending: true }),
        supabase.from('teams').select('*'),
      ]);

      setFixtures(fixturesData || []);
      setTeams(teamsData || []);

      // Load my teams if session exists
      if (session.playerId) {
        const { data: draftPicks } = await supabase
          .from('draft_picks')
          .select('team_api_id')
          .eq('game_player_id', session.playerId);
        if (draftPicks) setMyTeamIds(draftPicks.map((p) => p.team_api_id));

        const { data: playerPicks } = await supabase
          .from('player_picks')
          .select('player_api_id')
          .eq('game_player_id', session.playerId);
        if (playerPicks) setMyPlayerIds(playerPicks.map((p) => p.player_api_id));
      }

      setLoading(false);
    }

    load();

    // Realtime subscriptions
    const fixtureChannel = supabase
      .channel('match-center-fixtures')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'fixtures' }, (payload) => {
        setFixtures((prev) => prev.map((f) => (f.id === payload.new.id ? payload.new : f)));
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'fixtures' }, (payload) => {
        setFixtures((prev) => {
          const exists = prev.some((f) => f.id === payload.new.id);
          return exists ? prev : [...prev, payload.new].sort(
            (a, b) => new Date(a.kickoff_at) - new Date(b.kickoff_at)
          );
        });
      })
      .subscribe();

    const eventsChannel = supabase
      .channel('match-center-events')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'match_events' }, (payload) => {
        setEvents((prev) => {
          const fixtureId = payload.new.fixture_api_id;
          const existing = prev[fixtureId] || [];
          return { ...prev, [fixtureId]: [...existing, payload.new] };
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(fixtureChannel);
      supabase.removeChannel(eventsChannel);
    };
  }, [session.playerId]);

  async function loadEvents(fixtureApiId) {
    if (events[fixtureApiId]) return;
    const { data } = await supabase
      .from('match_events')
      .select('*')
      .eq('fixture_api_id', fixtureApiId)
      .order('minute', { ascending: true });
    if (data) setEvents((prev) => ({ ...prev, [fixtureApiId]: data }));
  }

  function handleToggleFixture(fixture) {
    if (expandedFixture === fixture.api_id) {
      setExpandedFixture(null);
    } else {
      setExpandedFixture(fixture.api_id);
      loadEvents(fixture.api_id);
    }
  }

  if (loading) {
    return (
      <div className="page loading-center">
        <div className="spinner" />
      </div>
    );
  }

  const liveFixtures = fixtures.filter((f) => f.status === 'LIVE' || f.status === '1H' || f.status === '2H' || f.status === 'HT');
  const groups = groupByDate(fixtures.filter((f) => f.status !== 'LIVE' && f.status !== '1H' && f.status !== '2H' && f.status !== 'HT'));

  return (
    <div className="page">
      <div className="container">
        <h1 style={{ marginBottom: 24 }}>Match Center</h1>

        {liveFixtures.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span className="badge badge-live">LIVE</span>
              <h2 style={{ fontSize: '1rem' }}>Live Matches</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {liveFixtures.map((fixture) => (
                <div key={fixture.id}>
                  <div
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleToggleFixture(fixture)}
                  >
                    <FixtureCard
                      fixture={fixture}
                      myTeamApiIds={myTeamIds}
                      isLive
                      teams={teams}
                    />
                  </div>
                  {expandedFixture === fixture.api_id && (
                    <div className="card" style={{ marginTop: 4, borderTop: 'none', borderRadius: '0 0 8px 8px' }}>
                      <EventTicker
                        events={events[fixture.api_id] || []}
                        myPlayerApiIds={myPlayerIds}
                        myTeamApiIds={myTeamIds}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {fixtures.length === 0 && (
          <div className="card text-center text-muted" style={{ padding: 40 }}>
            <p style={{ fontSize: '2rem', marginBottom: 12 }}>📅</p>
            <p>No fixtures loaded yet. Run the backfill script to populate matches.</p>
          </div>
        )}

        {Object.entries(groups).map(([date, dayFixtures]) => (
          <div key={date} style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {date}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {dayFixtures.map((fixture) => (
                <div key={fixture.id}>
                  <div
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleToggleFixture(fixture)}
                  >
                    <FixtureCard
                      fixture={fixture}
                      myTeamApiIds={myTeamIds}
                      isLive={false}
                      teams={teams}
                    />
                  </div>
                  {expandedFixture === fixture.api_id && (
                    <div className="card" style={{ marginTop: 4, borderTop: 'none', borderRadius: '0 0 8px 8px' }}>
                      <EventTicker
                        events={events[fixture.api_id] || []}
                        myPlayerApiIds={myPlayerIds}
                        myTeamApiIds={myTeamIds}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
