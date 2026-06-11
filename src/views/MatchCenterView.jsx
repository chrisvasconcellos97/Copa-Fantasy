import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import FixtureCard from '../components/FixtureCard';
import EventTicker from '../components/EventTicker';

function getSession() {
  try {
    return JSON.parse(localStorage.getItem('copa_session') || '{}');
  } catch {
    return {};
  }
}

function groupByDate(fixtures) {
  const groups = {};
  fixtures.forEach((f) => {
    const date = f.kickoff_at
      ? new Date(f.kickoff_at).toLocaleDateString('en-GB', { weekday: 'short', month: 'short', day: 'numeric' })
      : 'TBD';
    if (!groups[date]) groups[date] = [];
    groups[date].push(f);
  });
  return groups;
}

export default function MatchCenterView() {
  const [fixtures, setFixtures] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFixture, setSelectedFixture] = useState(null);
  const [myTeamIds, setMyTeamIds] = useState([]);
  const [myPlayerIds, setMyPlayerIds] = useState([]);
  const session = getSession();

  useEffect(() => {
    async function load() {
      setLoading(true);

      // Load fixtures
      const { data: fixtureData } = await supabase
        .from('fixtures')
        .select('*')
        .order('kickoff_at', { ascending: true });
      setFixtures(fixtureData || []);

      // Load events
      const { data: eventData } = await supabase
        .from('match_events')
        .select('*')
        .order('minute', { ascending: true });
      setEvents(eventData || []);

      // Load my teams/players if logged in
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
      .channel('fixtures-realtime')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'fixtures' }, (payload) => {
        setFixtures((prev) => prev.map((f) => (f.id === payload.new.id ? payload.new : f)));
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'fixtures' }, (payload) => {
        setFixtures((prev) => {
          if (prev.find((f) => f.id === payload.new.id)) return prev;
          return [...prev, payload.new].sort(
            (a, b) => new Date(a.kickoff_at) - new Date(b.kickoff_at)
          );
        });
      })
      .subscribe();

    const eventChannel = supabase
      .channel('events-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'match_events' }, (payload) => {
        setEvents((prev) => [...prev, payload.new]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(fixtureChannel);
      supabase.removeChannel(eventChannel);
    };
  }, [session.playerId]);

  const liveFixtures = fixtures.filter((f) => f.status === 'LIVE' || f.status === '1H' || f.status === '2H' || f.status === 'HT');
  const grouped = groupByDate(fixtures);

  return (
    <div className="page">
      <h1 className="title" style={{ marginBottom: '1.5rem' }}>Match Center</h1>

      {loading ? (
        <div className="loading-page">
          <div className="spinner" />
          <span>Loading fixtures...</span>
        </div>
      ) : (
        <>
          {/* Live section */}
          {liveFixtures.length > 0 && (
            <div className="card-section" style={{ marginBottom: '1.5rem', borderColor: 'rgba(239,68,68,0.3)' }}>
              <div className="section-header">
                <span className="section-title">🔴 Live Now</span>
                <span className="badge badge-live">{liveFixtures.length} LIVE</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem' }}>
                {liveFixtures.map((fixture) => (
                  <div key={fixture.id}>
                    <FixtureCard
                      fixture={fixture}
                      myTeamApiIds={myTeamIds}
                      isLive
                    />
                    {(selectedFixture === fixture.id || liveFixtures.length === 1) && (
                      <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: 'var(--card-bg)', borderRadius: 8 }}>
                        <EventTicker
                          events={events.filter((e) => e.fixture_api_id === fixture.api_id)}
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

          {/* All fixtures grouped by date */}
          {Object.entries(grouped).map(([date, dayFixtures]) => (
            <div key={date} className="card-section" style={{ marginBottom: '1rem' }}>
              <div className="label" style={{ marginBottom: '0.75rem' }}>{date}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {dayFixtures.map((fixture) => {
                  const isLive = liveFixtures.some((f) => f.id === fixture.id);
                  const fixtureEvents = events.filter((e) => e.fixture_api_id === fixture.api_id);
                  return (
                    <div key={fixture.id}>
                      <div
                        style={{ cursor: fixtureEvents.length > 0 ? 'pointer' : 'default' }}
                        onClick={() => setSelectedFixture(selectedFixture === fixture.id ? null : fixture.id)}
                      >
                        <FixtureCard
                          fixture={fixture}
                          myTeamApiIds={myTeamIds}
                          isLive={isLive}
                        />
                      </div>
                      {selectedFixture === fixture.id && fixtureEvents.length > 0 && (
                        <div style={{ marginTop: '0.4rem', padding: '0.5rem', background: 'var(--card-bg)', borderRadius: 8 }}>
                          <EventTicker
                            events={fixtureEvents}
                            myPlayerApiIds={myPlayerIds}
                            myTeamApiIds={myTeamIds}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {fixtures.length === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📅</div>
              <p>No fixtures loaded yet. Run the backfill script to populate match data.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
