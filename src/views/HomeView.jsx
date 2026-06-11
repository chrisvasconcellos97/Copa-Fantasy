import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { getOrCreateToken, setPlayerName, setGameId } from '../lib/session.js'

function randomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

export default function HomeView() {
  const navigate = useNavigate()
  const [createName, setCreateName] = useState('')
  const [joinName, setJoinName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleCreate() {
    if (!createName.trim()) return setError('Please enter your name')
    setLoading(true)
    setError('')
    const token = getOrCreateToken()
    const code = randomCode()
    const { data: game, error: ge } = await supabase
      .from('games')
      .insert({ code, host_session_token: token, status: 'lobby' })
      .select()
      .single()
    if (ge) { setError(ge.message); setLoading(false); return }
    const { error: pe } = await supabase
      .from('game_players')
      .insert({ game_id: game.id, name: createName.trim(), session_token: token })
    if (pe) { setError(pe.message); setLoading(false); return }
    setPlayerName(createName.trim())
    setGameId(game.id)
    navigate(`/lobby/${game.id}`)
  }

  async function handleJoin() {
    if (!joinName.trim()) return setError('Please enter your name')
    if (!joinCode.trim()) return setError('Please enter a game code')
    setLoading(true)
    setError('')
    const token = getOrCreateToken()
    const { data: game, error: ge } = await supabase
      .from('games')
      .select()
      .eq('code', joinCode.trim().toUpperCase())
      .single()
    if (ge || !game) { setError('Game not found. Check the code and try again.'); setLoading(false); return }
    if (game.status !== 'lobby') { setError('This game has already started.'); setLoading(false); return }
    const { error: pe } = await supabase
      .from('game_players')
      .insert({ game_id: game.id, name: joinName.trim(), session_token: token })
    if (pe) { setError(pe.message); setLoading(false); return }
    setPlayerName(joinName.trim())
    setGameId(game.id)
    navigate(`/lobby/${game.id}`)
  }

  return (
    <div className="page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div className="container" style={{ width: '100%' }}>
        <div className="text-center" style={{ marginBottom: '3rem' }}>
          <h1 style={{
            fontSize: 'clamp(2rem, 6vw, 3.5rem)',
            fontWeight: 900,
            color: 'var(--accent)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            textShadow: '0 0 40px rgba(200,150,58,0.4)',
            lineHeight: 1.1,
          }}>
            Copa Fantasy 2026
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.75rem', fontSize: '1rem', fontWeight: 500 }}>
            FIFA World Cup Draft Game
          </p>
        </div>

        <div className="grid-2" style={{ maxWidth: 640, margin: '0 auto' }}>
          <div className="card">
            <h2 style={{ marginBottom: '1.25rem', fontSize: '1.1rem', color: 'var(--accent)' }}>Create Game</h2>
            <div className="flex flex-col gap-3">
              <div className="form-group">
                <label className="form-label">Your Name</label>
                <input
                  className="input"
                  type="text"
                  placeholder="e.g. Alex"
                  value={createName}
                  onChange={e => setCreateName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreate()}
                  maxLength={40}
                />
              </div>
              <button
                className="btn btn-primary w-full"
                onClick={handleCreate}
                disabled={loading}
              >
                {loading ? 'Creating...' : 'Create Game'}
              </button>
            </div>
          </div>

          <div className="card">
            <h2 style={{ marginBottom: '1.25rem', fontSize: '1.1rem', color: 'var(--accent)' }}>Join Game</h2>
            <div className="flex flex-col gap-3">
              <div className="form-group">
                <label className="form-label">Game Code</label>
                <input
                  className="input"
                  type="text"
                  placeholder="e.g. AB12CD"
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value)}
                  style={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}
                  maxLength={10}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Your Name</label>
                <input
                  className="input"
                  type="text"
                  placeholder="e.g. Jordan"
                  value={joinName}
                  onChange={e => setJoinName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleJoin()}
                  maxLength={40}
                />
              </div>
              <button
                className="btn btn-primary w-full"
                onClick={handleJoin}
                disabled={loading}
              >
                {loading ? 'Joining...' : 'Join Game'}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <p className="error-text text-center" style={{ marginTop: '1.5rem' }}>{error}</p>
        )}
      </div>
    </div>
  )
}
