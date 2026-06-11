import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { getOrCreateToken } from '../lib/session'
import FixtureCard from '../components/FixtureCard'
import EventTicker from '../components/EventTicker'

const LIVE_STATUSES = ['1H', '2H', 'ET', 'P', 'LIVE', 'HT']
const FINISHED_STATUSES = ['FT', 'AET', 'PEN']

export default function MatchCenterView() {
  const [fixtures, setFixtures] = useState([])
  const [liveEvents, setLiveEvents] = useState([])
  const [teams, setTeams] = useState([])
  const [myTeamApiIds, setMyTeamApiIds] = useState([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(null)
  const token = getOrCreateToken()

  const loadFixtures = useCallback(async () => {
    const { data } = await supabase.from('fixtures').select('*').order('kickoff', { ascending: true })
    if (data) { setFixtures(data); setLastUpdated(new Date()) }
  }, [])

  const loadLiveEvents = useCallback(async (currentFixtures) => {
    const liveF = (currentFixtures || fixtures).filter(f => LIVE_STATUSES.includes(f.status_short))
    if (liveF.length === 0) { setLiveEvents([]); return }
    const ids = liveF.map(f => f.api_id)
    const { data } = await supabase.from('match_events').select('*').in('fixture_api_id', ids)
      .order('elapsed', { ascending: false }).limit(30)
    if (data) setLiveEvents(data)
  }, [fixtures])

  useEffect(() => {
    async function init() {
      setLoading(true)
      const { data: fixturesData } = await supabase.from('fixtures').select('*').order('kickoff', { ascending: true })
      if (fixturesData) { setFixtures(fixturesData); setLastUpdated(new Date()); loadLiveEvents(fixturesData) }
      const { data: teamsData } = await supabase.from('teams').select('*')
      if (teamsData) setTeams(teamsData)
      const { data: gp } = await supabase.from('game_players').select('id').eq('session_token', token)
      if (gp && gp.length > 0) {
        const ids = gp.map(p => p.id)
        const { data: myPicks } = await supabase.from('draft_picks').select('team_api_id').in('player_id', ids)
        if (myPicks) setMyTeamApiIds(myPicks.map(p => p.team_api_id))
      }
      setLoading(false)
    }
    init()
  }, [token])

  useEffect(() => {
    const interval = setInterval(loadFixtures, 30000)
    return () => clearInterval(interval)
  }, [loadFixtures])

  useEffect(() => {
    if (fixtures.length > 0) loadLiveEvents(fixtures)
  }, [fixtures])

  const teamsById = Object.fromEntries(teams.map(t => [t.api_id, t]))
  const enrich = f => ({ ...f, home_team_name: teamsById[f.home_team_api_id]?.name, away_team_name: teamsById[f.away_team_api_id]?.name })

  const liveF = fixtures.filter(f => LIVE_STATUSES.includes(f.status_short)).map(enrich)
  const upcomingF = fixtures.filter(f => !LIVE_STATUSES.includes(f.status_short) && !FINISHED_STATUSES.includes(f.status_short)).map(enrich)
  const finishedF = fixtures.filter(f => FINISHED_STATUSES.includes(f.status_short)).map(enrich).reverse()

  if (loading) return <div className="loading-screen"><div className="spinner" /><span>Loading matches...</span></div>

  return (
    <div className="view">
      <div className="view-header">
        <div>
          <div className="view-title">Match Center</div>
          {lastUpdated && <div className="view-subtitle">Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>}
        </div>
      </div>
      {liveEvents.length > 0 && <EventTicker events={liveEvents} myTeamApiIds={myTeamApiIds} />}
      {liveF.length > 0 && (
        <div className="match-section">
          <div className="match-section-title live">Live Now</div>
          {liveF.map(f => <FixtureCard key={f.id} fixture={f} myTeamApiIds={myTeamApiIds} isLive={true} />)}
        </div>
      )}
      {upcomingF.length > 0 && (
        <div className="match-section">
          <div className="match-section-title">Upcoming</div>
          {upcomingF.map(f => <FixtureCard key={f.id} fixture={f} myTeamApiIds={myTeamApiIds} isLive={false} />)}
        </div>
      )}
      {finishedF.length > 0 && (
        <div className="match-section">
          <div className="match-section-title">Results</div>
          {finishedF.slice(0, 20).map(f => <FixtureCard key={f.id} fixture={f} myTeamApiIds={myTeamApiIds} isLive={false} />)}
        </div>
      )}
      {fixtures.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">Calendar</div>
          <div>No fixtures loaded yet</div>
          <div style={{ fontSize: 12, marginTop: 8, color: 'var(--muted)' }}>Run the backfill script to import fixtures</div>
        </div>
      )}
    </div>
  )
}
