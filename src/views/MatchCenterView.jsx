import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.js';
import FixtureCard from '../components/FixtureCard.jsx';
import MatchDetail from '../components/MatchDetail.jsx';
import Mascot from '../components/Mascot.jsx';
import { useLiveSync } from '../hooks/useLiveSync.js';

function groupByDate(fixtures) {
  const groups = {};
  for (const f of fixtures) {
    const date = f.kickoff ? new Date(f.kickoff).toLocaleDateString('en-GB', { weekday: 'long', month: 'long', day: 'numeric' }) : 'Unknown Date';
    if (!groups[date]) groups[date] = [];
    groups[date].push(f);
  }
  return groups;
}

function isLiveFixture(fixture) {
  if (fixture.elapsed !== null && fixture.elapsed !== undefined) return true;
  const s = fixture.status_short;
  return ['1H', '2H', 'HT', 'ET', 'P', 'LIVE', 'in'].includes(s) || /^\d+'$/.test(s || '');
}

export default function MatchCenterView() {
  const [fixtures, setFixtures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedFixture, setExpandedFixture] = useState(null);
  useLiveSync();

  useEffect(() => {
    let mounted = true;

    async function loadFixtures() {
      const { data } = await supabase
        .from('fixtures')
        .select('*')
        .order('kickoff', { ascending: true });
      if (mounted) {
        setFixtures(data || []);
        setLoading(false);
      }
    }

    loadFixtures();

    const fixtureChannel = supabase
      .channel('fixtures-live')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'fixtures' }, payload => {
        if (mounted) setFixtures(prev => prev.map(f => f.id === payload.new.id ? payload.new : f));
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'fixtures' }, payload => {
        if (mounted) setFixtures(prev => [...prev, payload.new]);
      })
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(fixtureChannel);
    };
  }, []);

  const grouped = groupByDate(fixtures);
  const liveFixtures = fixtures.filter(isLiveFixture);

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
              return (
                <div key={fixture.id}>
                  <FixtureCard fixture={fixture} myTeamApiIds={[]} isLive />
                  <div style={{ marginTop: 8, background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 12 }}>
                    <MatchDetail fixture={fixture} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading"><div className="spinner" /></div>
      ) : fixtures.length === 0 ? (
        <div className="empty-state" style={{ paddingTop: 60, textAlign: 'center' }}>
          <Mascot pose="waiting" size={100} />
          <p style={{ marginTop: 16, fontWeight: 600 }}>No matches yet</p>
          <p className="text-muted text-sm mt-8">Fixtures will appear here once the tournament kicks off</p>
        </div>
      ) : (
        Object.entries(grouped).map(([date, dayFixtures]) => (
          <div key={date} style={{ marginBottom: 32 }}>
            <div className="section-header">{date}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {dayFixtures.map(fixture => {
                const isLive = isLiveFixture(fixture);
                return (
                  <div key={fixture.id}>
                    <div onClick={() => setExpandedFixture(expandedFixture === fixture.id ? null : fixture.id)}
                      style={{ cursor: 'pointer' }}>
                      <FixtureCard fixture={fixture} myTeamApiIds={[]} isLive={isLive} />
                    </div>
                    {expandedFixture === fixture.id && (
                      <div style={{ marginTop: 8, background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 12 }}>
                        <MatchDetail fixture={fixture} />
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
