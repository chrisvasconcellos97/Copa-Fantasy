import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getSession } from '../lib/session';
import FixtureCard from '../components/FixtureCard';
import EventTicker from '../components/EventTicker';

export default function MatchCenterView() {
  const [fixtures, setFixtures] = useState([]);
  const [events, setEvents] = useState({});
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState([]);
  const session = getSession();
  const myPlayerId = session?.playerId;

  const [myTeamApiIds, setMyTeamApiIds] = useState([]);
  const [myPlayerApiIds, setMyPlayerApiIds] = useState([]);

  // Load user context
  useEffect(() => {
    if (!myPlayerId) return;
    async function loadMyStuff() {
      const { data: draftPicks } = await supabase
        .from('draft_picks')
        .select('team_api_id')
        .eq('game_player_id', myPlayerId);
      if (draftPicks) setMyTeamApiIds(draftPicks.map((d) => String(d.team_api_id)));

      const { data: playerPicks } = await supabase
        .from('player_picks')
        .select('player_api_id')
        .eq('game_player_id', myPlayerId);
      if (playerPicks) setMyPlayerApiIds(playerPicks.map((p) => String(p.player_api_id)));
    }
    loadMyStuff();
  }, [myPlayerId]);

  // Load teams for name lookup
  useEffect(() => {
    async function loadTeams() {
      const { data } = await supabase.from('teams').select('api_id, name, logo_url');
      if (data) setTeams(data);
    }
    loadTeams();
  }, []);

  // Load fixtures
  useEffect(() => {
    async function loadFixtures() {
      setLoading(true);
      const { data, error } = await supabase
        .from('fixtures')
        .select('*')
        .order('kickoff_at', { ascending: true });
      if (!error && data) setFixtures(data);
      setLoading(false);
    }
    loadFixtures();

    const channel = supabase
      .channel('fixtures_realtime')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'fixtures' }, (payload) => {
        setFixtures((prev) =>
          prev.map((f) => (f.id === payload.new.id ? payload.new : f))
        );
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'fixtures' }, (payload) => {
        setFixtures((prev) => [...prev, payload.new].sort((a, b) => new Date(a.kickoff_at) - new Date(b.kickoff_at)));
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  // Load match events
  useEffect(() => {
    async function loadEvents() {
      const { data } = await supabase
        .from('match_events')
        .select('*')
        .order('minute', { ascending: true });
      if (data) {
        const grouped = {};
        data.forEach((ev) => {
          const fid = String(ev.fixture_api_id);
          if (!grouped[fid]) grouped[fid] = [];
          grouped[fid].push(ev);
        });
        setEvents(grouped);
      }
    }
    loadEvents();

    const channel = supabase
      .channel('match_events_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'match_events' }, (payload) => {
        const ev = payload.new;
        setEvents((prev) => {
          const fid = String(ev.fixture_api_id);
          return { ...prev, [fid]: [...(prev[fid] || []), ev] };
        });
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  function getTeamName(apiId) {
    const t = teams.find((x) => String(x.api_id) === String(apiId));
    return t?.name || `Team ${apiId}`;
  }

  function getTeamLogo(apiId) {
    const t = teams.find((x) => String(x.api_id) === String(apiId));
    return t?.logo_url || null;
  }

  // Enrich fixtures with team names
  const enrichedFixtures = fixtures.map((f) => ({
    ...f,
    home_team_name: getTeamName(f.home_team_api_id),
    away_team_name: getTeamName(f.away_team_api_id),
    home_logo_url: getTeamLogo(f.home_team_api_id),
    away_logo_url: getTeamLogo(f.away_team_api_id),
  }));

  // Group by date
  const grouped = {};
  enrichedFixtures.forEach((f) => {
    const date = f.kickoff_at
      ? new Date(f.kickoff_at).toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
      : 'TBD';
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(f);
  });

  const liveStatuses = ['1H', '2H', 'HT', 'ET', 'P', 'LIVE'];

  if (loading) {
    return (
      <div className="page">
        <div className="loading">
          <div className="spinner" />
          Loading fixtures...
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 800 }}>
        <h1 className="page-title">⚽ Match Center</h1>

        {fixtures.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📅</div>
            <div className="empty-state-title">No fixtures yet</div>
            <div className="text-muted">Fixtures will appear here once the tournament begins.</div>
          </div>
        ) : (
          Object.entries(grouped).map(([date, dayFixtures]) => (
            <div key={date} className="mb-6">
              <div className="section-title">{date}</div>
              <div className="flex flex-col gap-3">
                {dayFixtures.map((fixture) => {
                  const isLive = liveStatuses.includes(fixture.status);
                  const fixtureEvents = events[String(fixture.api_id)] || [];
                  return (
                    <div key={fixture.id}>
                      <FixtureCard
                        fixture={fixture}
                        myTeamApiIds={myTeamApiIds}
                        isLive={isLive}
                      />
                      {isLive && fixtureEvents.length > 0 && (
                        <div className="card-sm" style={{ marginTop: 4 }}>
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
          ))
        )}
      </div>
    </div>
  );
}
