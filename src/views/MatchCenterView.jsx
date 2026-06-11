import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getOrCreateToken, getPlayerName } from '../lib/session';
import FixtureCard from '../components/FixtureCard';
import EventTicker from '../components/EventTicker';

function groupByDate(fixtures) {
  const groups = {};
  fixtures.forEach(f => {
    const key = f.kickoff_at
      ? new Date(f.kickoff_at).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })
      : 'TBD';
    if (!groups[key]) groups[key] = [];
    groups[key].push(f);
  });
  return groups;
}

export default function MatchCenterView() {
  const myToken = getOrCreateToken();
  const [fixtures, setFixtures] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedFixture, setExpandedFixture] = useState(null);
  const [events, setEvents] = useState({});
  const [myTeamApiIds, setMyTeamApiIds] = useState([]);
  const [myPlayerApiIds, setMyPlayerApiIds] = useState([]);

  useEffect(() => {
    // Load fixtures and teams
    Promise.all([
      supabase.from('fixtures').select('*').order('kickoff_at', { ascending: true }),
      supabase.from('teams').select('*'),
    ]).then(([{ data: fx }, { data: tm }]) => {
      setFixtures(fx || []);
      setTeams(tm || []);
      setLoading(false);
    });

    // Load my team picks
    if (session?.playerId) {
      supabase
        .from('draft_picks')
        .select('team_api_id')
        .eq('game_player_id', session.playerId)
        .then(({ data }) => {
          if (data) setMyTeamApiIds(data.map(d => d.team_api_id));
        });

      supabase
        .from('player_picks')
        .select('player_api_id')
        .eq('game_player_id', session.playerId)
        .then(({ data }) => {
          if (data) setMyPlayerApiIds(data.map(d => d.player_api_id));
        });
    }

    // Realtime subscriptions
    const fixtureChannel = supabase
      .channel('fixtures-global')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'fixtures' }, (payload) => {
        setFixtures(prev => prev.map(f => f.id === payload.new.id ? payload.new : f));
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'fixtures' }, (payload) => {
        setFixtures(prev => [...prev, payload.new]);
      })
      .subscribe();

    const eventsChannel = supabase
      .channel('match-events-global')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'match_events' }, (payload) => {
        const ev = payload.new;
        setEvents(prev => ({
          ...prev,
          [ev.fixture_api_id]: [...(prev[ev.fixture_api_id] || []), ev],
        }));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(fixtureChannel);
      supabase.removeChannel(eventsChannel);
    };
  }, []);

  const handleExpandFixture = async (fixtureApiId) => {
    if (expandedFixture === fixtureApiId) {
      setExpandedFixture(null);
      return;
    }
    setExpandedFixture(fixtureApiId);
    if (!events[fixtureApiId]) {
      const { data } = await supabase
        .from('match_events')
        .select('*')
        .eq('fixture_api_id', fixtureApiId)
        .order('minute', { ascending: true });
      setEvents(prev => ({ ...prev, [fixtureApiId]: data || [] }));
    }
  };

  if (loading) {
    return (
      <div className="loading-center page">
        <div className="spinner" />
        <span className="text-muted">Loading matches...</span>
      </div>
    );
  }

  const grouped = groupByDate(fixtures);
  const dateKeys = Object.keys(grouped);

  return (
    <div className="page">
      <div className="container">
        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>🏟️ Match Center</h1>
        <p className="text-muted text-sm" style={{ marginBottom: 24 }}>Copa America 2026 Fixtures</p>

        {dateKeys.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">📅</div>
            <div>No fixtures yet.</div>
            <div className="text-muted text-sm mt-2">Run the backfill script to populate fixtures.</div>
          </div>
        )}

        {dateKeys.map(dateKey => (
          <div key={dateKey} style={{ marginBottom: 24 }}>
            <div className="section-title" style={{ marginBottom: 10 }}>{dateKey}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {grouped[dateKey].map(fixture => {
                const isLive = fixture.status === '1H' || fixture.status === '2H' || fixture.status === 'HT' || fixture.status === 'ET' || fixture.status === 'P';
                const fixtureEvents = events[fixture.api_id] || [];
                return (
                  <div key={fixture.id}>
                    <div onClick={() => handleExpandFixture(fixture.api_id)} style={{ cursor: 'pointer' }}>
                      <FixtureCard
                        fixture={fixture}
                        myTeamApiIds={myTeamApiIds}
                        isLive={isLive}
                        teams={teams}
                      />
                    </div>
                    {expandedFixture === fixture.api_id && (
                      <div style={{
                        background: 'var(--card-bg)',
                        border: '1px solid var(--border)',
                        borderTop: 'none',
                        borderRadius: '0 0 var(--radius) var(--radius)',
                        padding: '12px 16px',
                      }}>
                        <EventTicker
                          events={fixtureEvents}
                          myPlayerApiIds={myPlayerApiIds}
                          myTeamApiIds={myTeamApiIds}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
