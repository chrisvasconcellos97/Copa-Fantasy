import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getSession } from '../lib/session';
import FixtureCard from '../components/FixtureCard';
import EventTicker from '../components/EventTicker';

function groupByDate(fixtures) {
  const groups = {};
  for (const f of fixtures) {
    const date = f.kickoff_at
      ? new Date(f.kickoff_at).toLocaleDateString('en-US', {
          weekday: 'long', month: 'long', day: 'numeric',
        })
      : 'TBD';
    if (!groups[date]) groups[date] = [];
    groups[date].push(f);
  }
  return groups;
}

export default function MatchCenterView() {
  const session = getSession();
  const [fixtures, setFixtures] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [myTeamApiIds, setMyTeamApiIds] = useState([]);
  const [myPlayerApiIds, setMyPlayerApiIds] = useState([]);
  const [expandedFixtureId, setExpandedFixtureId] = useState(null);
  const [teams, setTeams] = useState([]);

  useEffect(() => {
    async function load() {
      const [fixturesRes, teamsRes] = await Promise.all([
        supabase.from('fixtures').select('*').order('kickoff_at'),
        supabase.from('teams').select('api_id, name, logo_url'),
      ]);

      const teamsList = teamsRes.data || [];
      setTeams(teamsList);

      // Enrich fixtures with team names and logos
      const enriched = (fixturesRes.data || []).map((f) => {
        const home = teamsList.find((t) => t.api_id === f.home_team_api_id);
        const away = teamsList.find((t) => t.api_id === f.away_team_api_id);
        return {
          ...f,
          home_team_name: home?.name || f.home_team_api_id,
          home_logo_url: home?.logo_url || null,
          away_team_name: away?.name || f.away_team_api_id,
          away_logo_url: away?.logo_url || null,
        };
      });
      setFixtures(enriched);

      // Load my teams/players if logged in
      if (session?.playerId) {
        const [draftPicksRes, playerPicksRes] = await Promise.all([
          supabase
            .from('draft_picks')
            .select('team_api_id')
            .eq('game_player_id', session.playerId),
          supabase
            .from('player_picks')
            .select('player_api_id')
            .eq('game_player_id', session.playerId),
        ]);
        setMyTeamApiIds((draftPicksRes.data || []).map((p) => p.team_api_id));
        setMyPlayerApiIds((playerPicksRes.data || []).map((p) => p.player_api_id));
      }

      // Load recent events
      const { data: eventsData } = await supabase
        .from('match_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      setEvents(eventsData || []);

      setLoading(false);
    }

    load();

    // Realtime subscriptions
    const fixtureChannel = supabase
      .channel('fixtures-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'fixtures' },
        () => load()
      )
      .subscribe();

    const eventsChannel = supabase
      .channel('events-live')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'match_events' },
        (payload) => {
          setEvents((prev) => [payload.new, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(fixtureChannel);
      supabase.removeChannel(eventsChannel);
    };
  }, []);

  if (loading) {
    return (
      <div className="loading-page">
        <div className="loading-spinner" />
        <span>Loading matches...</span>
      </div>
    );
  }

  const liveFixtures = fixtures.filter(
    (f) => f.status === 'live' || f.status === '1H' || f.status === '2H' || f.status === 'HT'
  );
  const byDate = groupByDate(fixtures);
  const dates = Object.keys(byDate);

  return (
    <div className="page">
      <h1 className="page-title">Match Center</h1>

      {/* Live section */}
      {liveFixtures.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="live-dot">LIVE</span>
            <span className="font-semibold">Live Matches</span>
          </div>
          <div className="grid grid-2" style={{ gap: 16 }}>
            {liveFixtures.map((fixture) => {
              const fixtureEvents = events.filter(
                (e) => e.fixture_api_id === fixture.api_id || e.fixture_api_id === fixture.id
              );
              const isExpanded = expandedFixtureId === fixture.id;
              return (
                <div key={fixture.id}>
                  <div
                    onClick={() => setExpandedFixtureId(isExpanded ? null : fixture.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <FixtureCard
                      fixture={fixture}
                      myTeamApiIds={myTeamApiIds}
                      isLive
                    />
                  </div>
                  {isExpanded && (
                    <div className="card card-sm mt-2">
                      <div className="text-xs text-muted mb-2" style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Match Events
                      </div>
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
      )}

      {/* All fixtures by date */}
      {dates.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon">📅</div>
          <div className="empty-state__title">No fixtures yet</div>
          <p className="text-muted text-sm">Run the backfill script to load fixtures</p>
        </div>
      ) : (
        dates.map((date) => (
          <div key={date} className="mb-6">
            <div className="pot-header mb-3">
              <span className="pot-label">{date}</span>
              <div className="divider" style={{ flex: 1, margin: '0 12px' }} />
            </div>
            <div className="grid grid-2" style={{ gap: 12 }}>
              {byDate[date].map((fixture) => (
                <FixtureCard
                  key={fixture.id}
                  fixture={fixture}
                  myTeamApiIds={myTeamApiIds}
                  isLive={
                    fixture.status === 'live' ||
                    fixture.status === '1H' ||
                    fixture.status === '2H' ||
                    fixture.status === 'HT'
                  }
                />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
