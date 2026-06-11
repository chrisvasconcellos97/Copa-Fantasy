import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.js';
import { getSession } from '../lib/session.js';
import FixtureCard from '../components/FixtureCard.jsx';
import EventTicker from '../components/EventTicker.jsx';

function groupByDate(fixtures) {
  const groups = {};
  fixtures.forEach((f) => {
    const key = f.kickoff_at ? f.kickoff_at.slice(0, 10) : 'TBD';
    if (!groups[key]) groups[key] = [];
    groups[key].push(f);
  });
  return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
}

function formatDate(dateStr) {
  if (dateStr === 'TBD') return 'Date TBD';
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}

export default function MatchCenterView() {
  const [fixtures, setFixtures] = useState([]);
  const [events, setEvents] = useState({});
  const [loading, setLoading] = useState(true);
  const [myTeamApiIds, setMyTeamApiIds] = useState([]);
  const [expandedFixture, setExpandedFixture] = useState(null);
  const session = getSession();

  useEffect(() => {
    async function loadData() {
      setLoading(true);

      // Load my teams if logged in
      if (session?.playerId) {
        const { data: draftPicks } = await supabase
          .from('draft_picks')
          .select('team_api_id')
          .eq('game_player_id', session.playerId);
        if (draftPicks) setMyTeamApiIds(draftPicks.map((p) => p.team_api_id));
      }

      // Load fixtures
      const { data: fixtureData } = await supabase
        .from('fixtures')
        .select('*')
        .order('kickoff_at', { ascending: true });

      if (fixtureData) setFixtures(fixtureData);
      setLoading(false);
    }

    loadData();

    // Realtime subscriptions
    const fixtureChannel = supabase
      .channel('fixtures-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fixtures' }, () => {
        loadData();
      })
      .subscribe();

    const eventChannel = supabase
      .channel('events-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'match_events' }, (payload) => {
        const event = payload.new;
        setEvents((prev) => {
          const fixtureEvents = prev[event.fixture_api_id] || [];
          return { ...prev, [event.fixture_api_id]: [...fixtureEvents, event] };
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(fixtureChannel);
      supabase.removeChannel(eventChannel);
    };
  }, [session?.playerId]);

  // Load events for live fixtures
  useEffect(() => {
    const liveFixtures = fixtures.filter((f) => f.status === 'LIVE' || f.status === '1H' || f.status === '2H');
    liveFixtures.forEach(async (f) => {
      if (events[f.api_id]) return;
      const { data } = await supabase
        .from('match_events')
        .select('*')
        .eq('fixture_api_id', f.api_id)
        .order('minute', { ascending: true });
      if (data) setEvents((prev) => ({ ...prev, [f.api_id]: data }));
    });
  }, [fixtures]);

  if (loading) {
    return (
      <div className="loader-center">
        <div className="spinner" />
      </div>
    );
  }

  const grouped = groupByDate(fixtures);

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Match Center</h1>
        <span className="badge badge-muted">{fixtures.length} fixtures</span>
      </div>

      {fixtures.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📅</div>
          <p>No fixtures yet.</p>
          <p className="text-sm mt-8">Run the backfill script to populate match data.</p>
        </div>
      ) : (
        grouped.map(([date, dayFixtures]) => (
          <div key={date} className="mb-24">
            <div className="section-title mb-12">{formatDate(date)}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {dayFixtures.map((fixture) => {
                const isLive = ['LIVE', '1H', '2H', 'HT'].includes(fixture.status);
                const fixtureEvents = events[fixture.api_id] || [];
                const isExpanded = expandedFixture === fixture.id;

                return (
                  <div key={fixture.id}>
                    <div
                      style={{ cursor: 'pointer' }}
                      onClick={() => setExpandedFixture(isExpanded ? null : fixture.id)}
                    >
                      <FixtureCard
                        fixture={fixture}
                        myTeamApiIds={myTeamApiIds}
                        isLive={isLive}
                      />
                    </div>
                    {isExpanded && isLive && (
                      <div className="card" style={{ borderRadius: '0 0 12px 12px', borderTop: 'none' }}>
                        <div className="section-title mb-8">Match Events</div>
                        <EventTicker
                          events={fixtureEvents}
                          myTeamApiIds={myTeamApiIds}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
