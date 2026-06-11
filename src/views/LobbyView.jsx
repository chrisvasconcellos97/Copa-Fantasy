import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getOrCreateToken } from '../lib/session'
import { useGame } from '../hooks/useGame'
import { usePlayers } from '../hooks/usePlayers'
import CopyCode from '../components/CopyCode'

export default function LobbyView() {
  const { gameId } = useParams()
  const navigate = useNavigate()
  const token = getOrCreateToken()
  const { game, loading: gameLoading } = useGame(gameId)
  const { players, loading: playersLoading } = usePlayers(gameId)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState('')

  const me = players.find(p => p.session_token === token)
  const isHost = game && game.host_session_token === token

  useEffect(() => {
    if (game && (game.status === 'drafting_teams' || game.status === 'selecting_players' || game.status === 'selecting_captain')) {
      navigate('/draft/' + gameId)
    }
    if (game && (game.status === 'tournament' || game.status === 'complete')) {
      navigate('/leaderboard/' + gameId)
    }
  }, [game, gameId, navigate])

  async function startDraft() {
    if (players.length < 2) { setError('Need at least 2 players to start'); return }
    setStarting(true)
    setError('')
    try {
      const totalPicks = players.length * 8
      const { error: e } = await supabase
        .from('games')
        .update({ status: 'drafting_teams', total_picks: totalPicks, current_pick_number: 1 })
        .eq('id', gameId)
      if (e) throw e
    } catch (e) {
      setError(e.message || 'Failed to start draft')
    }
    setStarting(false)
  }

  if (gameLoading || playersLoading) {
    return <div className="loading-screen"><div className="spinner" /><span>Loading lobby...</span></div>
  }

  return (
    <div className="view">
      <div className="view-header">
        <div>
          <div className="view-title">Game Lobby</div>
          <div className="view-subtitle">{players.length} player{players.length !== 1 ? 's' : ''} joined</div>
        </div>
        <span className="status-pill lobby"><span className="status-dot" />Lobby</span>
      </div>

      {game && <CopyCode code={game.code} />}

      {error && <div className="error-msg">{error}</div>}

      <div className="card">
        <div className="card-title">Players</div>
        <div className="players-list">
          {players.map(p => (
            <div key={p.id} className="player-row">
              <span className="player-row-name">{p.name}</span>
              {p.session_token === token && <span className="player-row-you">You</span>}
              {game && p.session_token === game.host_session_token && <span className="player-row-host">Host</span>}
            </div>
          ))}
          {players.length === 0 && (
            <div className="empty-state"><div>Waiting for players...</div></div>
          )}
        </div>
      </div>

      {isHost && (
        <div className="card">
          <div className="card-title">Host Controls</div>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14 }}>
            Start the draft when everyone has joined. You need at least 2 players.
          </p>
          <button className="btn-primary" onClick={startDraft} disabled={starting || players.length < 2}>
            {starting ? 'Starting...' : 'Start Draft'}
          </button>
        </div>
      )}

      {!isHost && (
        <div className="waiting-banner">Waiting for the host to start the draft...</div>
      )}

      <div className="card">
        <div className="card-title">Draft Format</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, color: 'var(--muted)' }}>
          <div>Snake draft across 4 pots, 2 picks per pot</div>
          <div>8 teams total per player</div>
          <div>{players.length} players x 8 teams = {players.length * 8} total picks</div>
        </div>
      </div>
    </div>
  )
}
