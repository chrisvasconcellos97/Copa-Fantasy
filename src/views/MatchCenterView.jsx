import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.js';
import { getSession } from '../lib/session.js';
import FixtureCard from '../components/FixtureCard.jsx';
import EventTicker from '../components/EventTicker.jsx';

function groupByDate(fixtures) {
  const groups = {};
  for (const f of fixtures) {
    const date = f.kickoff_at ? new Date(f.kickoff_at).toLocaleDateString('en-GB', { weekday: 'long', month: 'long', day: 'numeric' }) : 'Unknown Date';
    if (!groups[date]) groups[date] = [];
    groups[date].push(f);
  }
  return groups;
}

const LIVE_STATUSES = ['1H', '2H', 'HT', 'ET', 'P', 'LIVE'];

export default function MatchCenterView() {
  const [fixtures, setFixtures] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedFixture, setExpandedFixture] = useState(null);
  const session = getSession();

  useEffect(() => {
    let mounted = true;

    async function loadFixtures() {
      const { data } = await supabase
        .from('fixtures')
        .select('*')
        .order('kickoff_at', { ascending: true });
      if (mounted) {
        setFixtures(data || []);
        setLoading(false);
      }
    }

    async function loadEvents() {
      const { data } = await supabase
        .from('match_events')
        .select('*')
        .order('minute', { ascending: true });
      if (mounted) setEvents(data || []);
    }

    loadFixtures();
    loadEvents();

    const fixtureChannel = supabase
      .channel('fixtures-live')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'fixtures' }, payload => {
        if (mounted) setFixtures(prev => prev.map(f => f.id === payload.new.id ? payload.new : f));
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'fixtures' }, payload => {
        if (mounted) setFixtures(prev => [...prev, payload.new]);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'match_events' }, payload => {
        if (mounted) setEvents(prev => [...prev, payload.new]);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'match_events' }, payload => {
        if (mounted) setEvents(prev => prev.map(e => e.id === payload.new.id ? payload.new : e));
      })
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(fixtureChannel);
    };
  }, []);

  const grouped = groupByDate(fixtures);
  const liveFixtures = fixtures.filter(f => LIVE_STATUSES.includes(f.status));

  return (
    <div className="page-wide">
      <h1 className="page-title">Match Center</h1>

      {liveFixtures.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <div className="section-header" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="badge badge-live">LIVE</span>
            Live Matches
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {liveFixtures.map(fixture => {
              const fixtureEvents = events.filter(e => e.fixture_api_id === fixture.api_id);
              return (
                <div key={fixture.id}>
                  <div onClick={() => setExpandedFixture(expandedFixture === fixture.id ? null : fixture.id)}
                    style={{ cursor: 'pointer' }}>
                    <FixtureCard fixture={fixture} myTeamApiIds={[]} isLive />
                  </div>
                  {expandedFixture === fixture.id && (
                    <div style={{ marginTop: 8, background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 12 }}>
                      <EventTicker events={fixtureEvents} myPlayerApiIds={[]} myTeamApiIds={[]} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading"><div className="spinner" /></div>
      ) : fixtures.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon">📅</div>
          <div className="empty-state__text">No fixtures scheduled yet</div>
        </div>
      ) : (
        Object.entries(grouped).map(([date, dayFixtures]) => (
          <div key={date} style={{ marginBottom: 32 }}>
            <div className="section-header">{date}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {dayFixtures.map(fixture => {
                const isLive = LIVE_STATUSES.includes(fixture.status);
                return (
                  <div key={fixture.id}>
                    <div onClick={() => setExpandedFixture(expandedFixture === fixture.id ? null : fixture.id)}
                      style={{ cursor: 'pointer' }}>
                      <FixtureCard fixture={fixture} myTeamApiIds={[]} isLive={isLive} />
                    </div>
                    {expandedFixture === fixture.id && (
                      <div style={{ marginTop: 8, background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 12 }}>
                        <EventTicker
                          events={events.filter(e => e.fixture_api_id === fixture.api_id)}
                          myPlayerApiIds={[]}
                          myTeamApiIds={[]}
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
