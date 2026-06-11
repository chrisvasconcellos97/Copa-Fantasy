import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { getOrCreateToken } from '../lib/session.js'

export default function LobbyView() {
  const { gameId } = useParams()
  const navigate = useNavigate()
  const [game, setGame] = useState(null)
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const [copied, setCopied] = useState(false)
  const token = getOrCreateToken()

  useEffect(() => {
    fetchData()
    const channel = supabase
      .channel(`lobby-${gameId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'game_players', filter: `game_id=eq.${gameId}`
      }, () => fetchPlayers())
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${gameId}`
      }, (payload) => {
        const g = payload.new
        setGame(g)
        if (g.status === 'drafting') navigate(`/draft/${gameId}`)
        if (g.status === 'tournament' || g.status === 'complete') navigate(`/leaderboard/${gameId}`)
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [gameId])

  async function fetchData() {
    const [{ data: g }, { data: ps }] = await Promise.all([
      supabase.from('games').select().eq('id', gameId).single(),
      supabase.from('game_players').select().eq('game_id', gameId).order('created_at'),
    ])
    setGame(g)
    setPlayers(ps || [])
    setLoading(false)
    if (g?.status === 'drafting') navigate(`/draft/${gameId}`)
    if (g?.status === 'tournament' || g?.status === 'complete') navigate(`/leaderboard/${gameId}`)
  }

  async function fetchPlayers() {
    const { data } = await supabase.from('game_players').select().eq('game_id', gameId).order('created_at')
    setPlayers(data || [])
  }

  async function startDraft() {
    setStarting(true)
    const shuffled = [...players].sort(() => Math.random() - 0.5)
    const updates = shuffled.map((p, i) =>
      supabase.from('game_players').update({ draft_order: i + 1 }).eq('id', p.id)
    )
    await Promise.all(updates)
    await supabase.from('games').update({
      status: 'drafting',
      total_picks: players.length * 4,
      current_pick_number: 0,
    }).eq('id', gameId)
    navigate(`/draft/${gameId}`)
  }

  function copyCode() {
    if (game?.code) {
      navigator.clipboard.writeText(game.code).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
    }
  }

  if (loading) return (
    <div className="page flex items-center justify-center" style={{ minHeight: '100vh' }}>
      <div className="spinner" />
    </div>
  )
  if (!game) return (
    <div className="page text-center" style={{ paddingTop: '4rem' }}>Game not found.</div>
  )

  const isHost = game.host_session_token === token

  return (
    <div className="page">
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">Game Lobby</h1>
          <p className="page-subtitle">Share the code with your friends to join</p>
        </div>

        {/* Game Code */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <p className="section-heading" style={{ marginBottom: '0.5rem' }}>Game Code {copied ? '— Copied!' : '(click to copy)'}</p>
          <div className="code-display" onClick={copyCode}>
            {game.code}
            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              {copied ? '✓' : '⎘'}
            </span>
          </div>
        </div>

        {/* Players list */}
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ marginBottom: '1rem', fontSize: '1rem' }}>
            Players <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({players.length})</span>
          </h2>
          {players.length === 0 && (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No players yet...</p>
          )}
          <div className="flex flex-col gap-2">
            {players.map(p => (
              <div key={p.id} className="player-row">
                <div className="player-avatar">{p.name.charAt(0).toUpperCase()}</div>
                <span style={{ fontWeight: 600, flex: 1 }}>{p.name}</span>
                {p.session_token === token && (
                  <span className="badge badge-blue" style={{ fontSize: '0.68rem' }}>You</span>
                )}
                {p.session_token === game.host_session_token && (
                  <span className="badge badge-accent" style={{ fontSize: '0.68rem' }}>Host</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div style={{ textAlign: 'center' }}>
          {isHost ? (
            <>
              <button
                className="btn btn-primary btn-lg"
                style={{ minWidth: 200 }}
                disabled={players.length < 2 || starting}
                onClick={startDraft}
              >
                {starting ? 'Starting...' : 'Start Draft'}
              </button>
              {players.length < 2 && (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '0.75rem' }}>
                  Need at least 2 players to start
                </p>
              )}
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: 'var(--accent)',
                animation: 'pulse 1.5s ease-in-out infinite',
              }} />
              <p style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
                Waiting for host to start the draft...
              </p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  )
}
