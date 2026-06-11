import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getOrCreateToken } from '../lib/session'
import { useGame } from '../hooks/useGame'
import { usePlayers } from '../hooks/usePlayers'
import { useScores } from '../hooks/useScores'
import LeaderboardRow from '../components/LeaderboardRow'

export default function LeaderboardView() {
  const { gameId } = useParams()
  const token = getOrCreateToken()
  const { game } = useGame(gameId)
  const { players } = usePlayers(gameId)
  const { scores, loading } = useScores(gameId)

  const [expandedId, setExpandedId] = useState(null)
  const [allDraftPicks, setAllDraftPicks] = useState([])
  const [allPlayerPicks, setAllPlayerPicks] = useState([])
  const [teams, setTeams] = useState([])
  const [overrides, setOverrides] = useState([])
  const [error, setError] = useState('')

  const me = players.find(p => p.session_token === token)
  const isHost = game && game.host_session_token === token

  useEffect(() => {
    if (!gameId) return
    supabase.from('draft_picks').select('*').eq('game_id', gameId).then(({ data }) => setAllDraftPicks(data || []))
    supabase.from('player_picks').select('*').eq('game_id', gameId).then(({ data }) => setAllPlayerPicks(data || []))
    supabase.from('teams').select('*').then(({ data }) => setTeams(data || []))
    supabase.from('score_overrides').select('*').eq('game_id', gameId).then(({ data }) => setOverrides(data || []))
  }, [gameId])

  async function applyOverride(playerId, delta, reason) {
    if (!delta || isNaN(delta)) { setError('Enter a valid point delta'); return }
    setError('')
    try {
      const { error: e } = await supabase.from('score_overrides').insert({
        game_id: gameId,
        game_player_id: playerId,
        delta_points: delta,
        reason: reason || 'Manual override'
      })
      if (e) throw e

      // Refresh overrides
      const { data } = await supabase.from('score_overrides').select('*').eq('game_id', gameId)
      setOverrides(data || [])
    } catch (e) {
      setError(e.message || 'Failed to apply override')
    }
  }

  // Build ranked list merging scores + overrides
  const rankedPlayers = players.map(p => {
    const score = scores.find(s => s.game_player_id === p.id)
    const myOverrides = overrides.filter(o => o.game_player_id === p.id)
    const overrideTotal = myOverrides.reduce((sum, o) => sum + (o.delta_points || 0), 0)
    const displayScore = score ? { ...score, total_points: (score.total_points || 0) + overrideTotal } : { total_points: overrideTotal, team_points: 0, player_points: 0, captain_bonus: 0 }
    return { player: p, score: displayScore, overrides: myOverrides }
  }).sort((a, b) => b.score.total_points - a.score.total_points)

  const statusLabel = {
    lobby: 'Lobby',
    drafting_teams: 'Drafting',
    selecting_players: 'Selecting Players',
    selecting_captain: 'Selecting Captain',
    tournament: 'Live',
    complete: 'Complete'
  }

  if (loading) return <div className="loading-screen"><div className="spinner" /><span>Loading standings…</span></div>

  return (
    <div className="view">
      <div className="view-header">
        <div>
          <div className="view-title">Standings</div>
          {game && <div className="view-subtitle">{statusLabel[game.status] || game.status} · {players.length} players</div>}
        </div>
        {game && (
          <span className={'status-pill ' + (game.status === 'tournament' ? 'live' : game.status === 'lobby' ? 'lobby' : 'drafting')}>
            <span className="status-dot" />
            {statusLabel[game.status] || game.status}
          </span>
        )}
      </div>

      {error && <div className="error-msg">{error}</div>}

      {rankedPlayers.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">🏆</div>
          <div>No scores yet</div>
          <div style={{ fontSize: 12, marginTop: 8, color: 'var(--muted)' }}>Scores will appear once the tournament starts</div>
        </div>
      )}

      {rankedPlayers.map(({ player, score, overrides: playerOverrides }, i) => {
        const myPicks = allDraftPicks.filter(d => d.player_id === player.id)
        const myPlayerPicks = allPlayerPicks.filter(pp => pp.game_player_id === player.id)
        return (
          <div key={player.id}>
            <LeaderboardRow
              rank={i + 1}
              player={player}
              score={score}
              picks={myPicks}
              playerPicks={myPlayerPicks}
              teams={teams}
              isExpanded={expandedId === player.id}
              onToggle={() => setExpandedId(expandedId === player.id ? null : player.id)}
              isHost={isHost}
              onOverride={applyOverride}
            />
            {playerOverrides.length > 0 && expandedId === player.id && (
              <div style={{ padding: '0 16px 8px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {playerOverrides.map(o => (
                  <span key={o.id} className="override-chip">
                    <span className={'override-delta ' + (o.delta_points >= 0 ? 'pos' : 'neg')}>
                      {o.delta_points >= 0 ? '+' : ''}{o.delta_points}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>{o.reason}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        )
      })}

      {isHost && game && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-title">Host Controls</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}>
            Game code: <strong style={{ color: 'var(--gold)', letterSpacing: '.08em' }}>{game.code}</strong>
          </div>
          {game.status === 'tournament' && (
            <button
              className="btn-secondary"
              onClick={async () => {
                await supabase.from('games').update({ status: 'complete' }).eq('id', gameId)
              }}
            >
              Mark Tournament Complete
            </button>
          )}
        </div>
      )}
    </div>
  )
}
