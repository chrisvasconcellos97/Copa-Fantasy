import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getOrCreateToken, getGameId } from '../lib/session';
import FixtureCard from '../components/FixtureCard';

export default function MatchCenterView() {
  const [fixtures, setFixtures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [myTeamApiIds, setMyTeamApiIds] = useState([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('fixtures').select('*').order('match_date', { ascending: true });
      setFixtures(data || []);
      setLoading(false);
    };
    load();

    const ch = supabase.channel('fixtures-all')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fixtures' }, load)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, []);

  useEffect(() => {
    const loadMyTeams = async () => {
      const token = getOrCreateToken();
      const gameId = getGameId();
      if (!gameId) return;
      const { data: me } = await supabase
        .from('game_players')
        .select('id')
        .eq('game_id', gameId)
        .eq('player_token', token)
        .maybeSingle();
      if (!me) return;
      const { data: myPicks } = await supabase
        .from('draft_picks')
        .select('team_api_id')
        .eq('game_player_id', me.id);
      setMyTeamApiIds((myPicks || []).map(p => p.team_api_id));
    };
    loadMyTeams();
  }, []);

  const liveFixtures = fixtures.filter(f =>
    f.status === 'live' || f.status === '1H' || f.status === '2H' || f.status === 'HT' || f.status === 'ET'
  );
  const upcomingFixtures = fixtures.filter(f => f.status === 'NS' || f.status === 'scheduled' || !f.status);
  const finishedFixtures = fixtures.filter(f => f.status === 'FT' || f.status === 'AET' || f.status === 'PEN' || f.status === 'finished');
  const myFixtures = fixtures.filter(f =>
    myTeamApiIds.includes(f.home_team_api_id) || myTeamApiIds.includes(f.away_team_api_id)
  );

  const displayed = filter === 'mine' ? myFixtures
    : filter === 'live' ? liveFixtures
    : filter === 'upcoming' ? upcomingFixtures
    : filter === 'finished' ? finishedFixtures
    : fixtures;

  const groupByDate = (list) => {
    const map = {};
    list.forEach(f => {
      const d = f.match_date ? new Date(f.match_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : 'TBD';
      if (!map[d]) map[d] = [];
      map[d].push(f);
    });
    return map;
  };

  const grouped = filter === 'live' ? { 'Live Now': displayed } : groupByDate(displayed);

  if (loading) return <div className="page"><div className="spinner" /></div>;

  return (
    <div className="page">
      <h1 className="h1 mb-2">Match Center</h1>
      <p className="text-muted mb-4">Live scores and upcoming fixtures for Copa Mundial 2026.</p>

      <div className="flex gap-2 mb-6" style={{ flexWrap: 'wrap' }}>
        {[
          { key: 'all', label: `All (${fixtures.length})` },
          { key: 'live', label: `🔴 Live (${liveFixtures.length})` },
          { key: 'mine', label: `⭐ My Teams (${myFixtures.length})` },
          { key: 'upcoming', label: `Upcoming (${upcomingFixtures.length})` },
          { key: 'finished', label: `Finished (${finishedFixtures.length})` },
        ].map(f => (
          <button
            key={f.key}
            className={`pot-tab ${filter === f.key ? 'pot-tab--active' : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {displayed.length === 0 ? (
        <div className="card text-center">
          <div style={{ fontSize: '2rem', marginBottom: 8 }}>📭</div>
          <p className="text-muted">No fixtures found.</p>
          {filter === 'mine' && myTeamApiIds.length === 0 && (
            <p className="text-muted text-sm mt-2">Join or create a game and complete the draft to see your teams' matches.</p>
          )}
        </div>
      ) : (
        Object.entries(grouped).map(([date, list]) => (
          <div key={date} className="mb-6">
            <div className="label mb-3">{date}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {list.map(f => (
                <FixtureCard
                  key={f.id}
                  fixture={f}
                  myTeamApiIds={myTeamApiIds}
                  isLive={liveFixtures.some(lf => lf.id === f.id)}
                />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
