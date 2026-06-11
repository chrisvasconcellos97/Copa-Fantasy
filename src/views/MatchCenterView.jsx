import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getGameId, getOrCreateToken } from '../lib/session';
import FixtureCard from '../components/FixtureCard';
import EventTicker from '../components/EventTicker';

const LIVE_STATUSES = ['1H', '2H', 'ET', 'P', 'HT', 'BT'];

export default function MatchCenterView() {
  const navigate = useNavigate();
  const [fixtures, setFixtures] = useState([]);
  const [events, setEvents] = useState([]);
  const [myTeamApiIds, setMyTeamApiIds] = useState([]);
  const [myPlayerApiIds, setMyPlayerApiIds] = useState([]);
  const [teamsMap, setTeamsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);

  const gameId = getGameId();
  const myToken = getOrCreateToken();

  const loadData = useCallback(async () => {
    try {
      // Load teams map
      const { data: teamsData } = await supabase.from('teams').select('*');
      const tm = {};
      if (teamsData) teamsData.forEach((t) => { tm[t.api_id] = t; });
      setTeamsMap(tm);

      // Load today's fixtures (and recent)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { data: fixturesData } = await supabase
        .from('fixtures')
        .select('*')
        .gte('kickoff', today.toISOString())
        .lt('kickoff', tomorrow.toISOString())
        .order('kickoff', { ascending: true });

      // Enrich fixtures with team info
      const enriched = (fixturesData || []).map((f) => ({
        ...f,
        home_name: tm[f.home_team_api_id]?.name || null,
        home_logo: tm[f.home_team_api_id]?.logo_url || null,
        away_name: tm[f.away_team_api_id]?.name || null,
        away_logo: tm[f.away_team_api_id]?.logo_url || null,
      }));
      setFixtures(enriched);

      // Load my teams if in a game
      if (gameId) {
        const { data: gp } = await supabase
          .from('game_players')
          .select('id')
          .eq('game_id', gameId)
          .eq('session_token', myToken)
          .single();

        if (gp) {
          const { data: myPicks } = await supabase
            .from('draft_picks')
            .select('team_api_id')
            .eq('game_id', gameId)
            .eq('player_id', gp.id);
          setMyTeamApiIds((myPicks || []).map((p) => p.team_api_id));

          const { data: myPP } = await supabase
            .from('player_picks')
            .select('player_api_id')
            .eq('game_id', gameId)
            .eq('game_player_id', gp.id);
          setMyPlayerApiIds((myPP || []).map((p) => p.player_api_id));
        }
      }

      // Load live match events
      const liveIds = (fixturesData || [])
        .filter((f) => LIVE_STATUSES.includes(f.status_short))
        .map((f) => f.api_id);

      if (liveIds.length > 0) {
        const { data: evData } = await supabase
          .from('match_events')
          .select('*')
          .in('fixture_api_id', liveIds)
          .order('elapsed', { ascending: false })
          .limit(50);
        setEvents(evData || []);
      } else {
        setEvents([]);
      }

      setLastRefresh(new Date());
    } catch (err) {
      console.error('Error loading match center:', err);
    } finally {
      setLoading(false);
    }
  }, [gameId, myToken]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  const liveFixtures = fixtures.filter((f) => LIVE_STATUSES.includes(f.status_short));
  const upcomingFixtures = fixtures.filter((f) => f.status_short === 'NS');
  const finishedFixtures = fixtures.filter((f) => ['FT', 'AET', 'PEN'].includes(f.status_short));

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p>Loading matches…</p>
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: 32 }}>
      <div className="nav">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>← Back</button>
        <span className="nav-logo">Match Centre</span>
        <div className="flex items-center gap-2">
          {lastRefresh && (
            <span className="text-xs text-muted">↻ {lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          )}
          <button className="btn btn-ghost btn-sm" onClick={loadData}>Refresh</button>
        </div>
      </div>

      <div className="page" style={{ paddingTop: 16 }}>
        <div className="container">

          {/* Live events ticker */}
          {liveFixtures.length > 0 && events.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div className="pot-section__title mb-2">Live Events</div>
              <EventTicker events={events} myPlayerApiIds={myPlayerApiIds} myTeamApiIds={myTeamApiIds} />
            </div>
          )}

          {/* Live fixtures */}
          {liveFixtures.length > 0 && (
            <div className="pot-section">
              <div className="pot-section__title">
                <span className="status-pill status-pill--live" style={{ display: 'inline-flex', gap: 6 }}>LIVE</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {liveFixtures.map((f) => (
                  <FixtureCard key={f.id} fixture={f} myTeamApiIds={myTeamApiIds} isLive />
                ))}
              </div>
            </div>
          )}

          {/* Upcoming */}
          {upcomingFixtures.length > 0 && (
            <div className="pot-section">
              <div className="pot-section__title">Today's Fixtures</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {upcomingFixtures.map((f) => (
                  <FixtureCard key={f.id} fixture={f} myTeamApiIds={myTeamApiIds} isLive={false} />
                ))}
              </div>
            </div>
          )}

          {/* Finished */}
          {finishedFixtures.length > 0 && (
            <div className="pot-section">
              <div className="pot-section__title">Results</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {finishedFixtures.map((f) => (
                  <FixtureCard key={f.id} fixture={f} myTeamApiIds={myTeamApiIds} isLive={false} />
                ))}
              </div>
            </div>
          )}

          {fixtures.length === 0 && (
            <div className="empty-state">
              <span className="emoji-big">📅</span>
              <div className="font-bold mb-2">No fixtures today</div>
              <p className="text-muted text-sm">Check back when the tournament begins.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
