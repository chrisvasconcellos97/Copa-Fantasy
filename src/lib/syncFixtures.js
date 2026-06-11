import { apiFetch } from './apiFootball.js'

const LIVE_STATUSES = ['1H', '2H', 'HT', 'ET', 'P', 'BT']

export async function syncFixtures(supabase) {
  const allFixtures = await apiFetch('/fixtures', { league: 1, season: 2026, timezone: 'UTC' })

  const todayStr = new Date().toISOString().slice(0, 10)
  const todayFixtures = allFixtures.filter(f => {
    const fixtureDate = f.fixture.date ? f.fixture.date.slice(0, 10) : null
    return fixtureDate === todayStr
  })

  for (const fixture of todayFixtures) {
    await supabase.from('fixtures').upsert(
      {
        api_id: fixture.fixture.id,
        round: fixture.league.round,
        status_short: fixture.fixture.status.short,
        status_long: fixture.fixture.status.long,
        elapsed: fixture.fixture.status.elapsed,
        kickoff: fixture.fixture.date,
        home_team_api_id: fixture.teams.home.id,
        away_team_api_id: fixture.teams.away.id,
        home_goals: fixture.goals.home,
        away_goals: fixture.goals.away,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'api_id' }
    )
  }

  const liveFixtures = todayFixtures.filter(f =>
    LIVE_STATUSES.includes(f.fixture.status.short)
  )

  for (const fixture of liveFixtures) {
    const fixtureApiId = fixture.fixture.id
    const events = await apiFetch('/fixtures/events', { fixture: fixtureApiId })

    for (const event of events) {
      await supabase.from('match_events').upsert(
        {
          fixture_api_id: fixtureApiId,
          team_api_id: event.team.id,
          player_api_id: event.player.id,
          assist_api_id: event.assist.id,
          type: event.type,
          detail: event.detail,
          elapsed: event.time.elapsed,
          dedupe_key: `${fixtureApiId}-${event.type}-${event.time.elapsed}-${event.player.id}`,
        },
        { onConflict: 'dedupe_key' }
      )
    }
  }

  return todayFixtures.length
}
