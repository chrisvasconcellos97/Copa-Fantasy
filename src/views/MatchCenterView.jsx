import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getOrCreateToken } from '../lib/session';
import FixtureCard from '../components/FixtureCard';
import EventTicker from '../components/EventTicker';

export default function MatchCenterView() {
  const [fixtures, setFixtures] = useState([]);
  const [events, setEvents] = useState([]);
  const [myTeamApiIds, setMyTeamApiIds] = useState([]);
  const [myPlayerApiIds, setMyPlayerApiIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const token = getOrCreateToken();

  useEffect(() => {
    loadAll();
    const interval = setInterval(() => {
      loadAll();
      setLastRefresh(new Date());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  async function loadAll() {
    await Promise.all([loadFixtures(), loadMyTeams()]);
  }

  async function loadFixtures() {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('fixtures')
      .select('*')
      .gte('kickoff', `${today}T00:00:00`)
      .lte('kickoff', `${today}T23:59:59`)
      .order('kickoff', { ascending: true });

    if (data) {
      setFixtures(data);
      const liveIds = data
        .filter((f) => ['1H', '2H', 'HT', 'ET', 'P', 'LIVE'].includes(f.status_short))
        .map((f) => f.api_id);
      if (liveIds.length > 0) loadEvents(liveIds);
    }
    setLoading(false);
  }

  async function loadEvents(fixtureApiIds) {
    const { data } = await supabase
      .from('match_events')
      .select('*')
      .in('fixture_api_id', fixtureApiIds)
      .order('elapsed', { ascending: true });
    if (data) setEvents(data);
  }

  async function loadMyTeams() {
    // Find the player record for the current session across all games
    const { data: gamePlayers } = await supabase
      .from('game_players')
      .select('id')
      .eq('session_token', token);

    if (!gamePlayers || gamePlayers.length === 0) return;
    const gpIds = gamePlayers.map((gp) => gp.id);

    const { data: draftPicks } = await supabase
      .from('draft_picks')
      .select('team_api_id')
      .in('player_id', gpIds);
    if (draftPicks) setMyTeamApiIds(draftPicks.map((d) => d.team_api_id));

    const { data: playerPicks } = await supabase
      .from('player_picks')
      .select('player_api_id')
      .in('game_player_id', gpIds);
    if (playerPicks) setMyPlayerApiIds(playerPicks.map((p) => p.player_api_id));
  }

  const liveFixtures = fixtures.filter((f) => ['1H', '2H', 'HT', 'ET', 'P', 'LIVE'].includes(f.status_short));
  const upcomingFixtures = fixtures.filter((f) => ['NS', 'TBD'].includes(f.status_short));
  const finishedFixtures = fixtures.filter((f) => ['FT', 'AET', 'PEN'].includes(f.status_short));

  if (loading) {
    return <div className="view"><div className="spinner" /></div>;
  }

  return (
    <div className="view">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1>Match Centre</h1>
        <span className="muted text-xs">
          Updated {lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      {liveFixtures.length > 0 && (
        <>
          <div className="section-title" style={{ color: 'var(--danger)' }}>🔴 Live</div>
          {liveFixtures.map((f) => (
            <FixtureCard key={f.id} fixture={f} myTeamApiIds={myTeamApiIds} isLive />
          ))}
          {events.length > 0 && (
            <div style={{ marginTop: 16, marginBottom: 24 }}>
              <div className="section-title">Match Events</div>
              <EventTicker events={events} myPlayerApiIds={myPlayerApiIds} myTeamApiIds={myTeamApiIds} />
            </div>
          )}
        </>
      )}

      {upcomingFixtures.length > 0 && (
        <>
          <div className="section-title">Upcoming Today</div>
          {upcomingFixtures.map((f) => (
            <FixtureCard key={f.id} fixture={f} myTeamApiIds={myTeamApiIds} />
          ))}
        </>
      )}

      {finishedFixtures.length > 0 && (
        <>
          <div className="section-title">Finished</div>
          {finishedFixtures.map((f) => (
            <FixtureCard key={f.id} fixture={f} myTeamApiIds={myTeamApiIds} />
          ))}
        </>
      )}

      {fixtures.length === 0 && (
        <div className="empty-state">
          <div className="empty-state__icon">📅</div>
          <div>No matches today</div>
          <div className="muted text-sm" style={{ marginTop: 6 }}>Check back on match day</div>
        </div>
      )}
    </div>
  );
}
