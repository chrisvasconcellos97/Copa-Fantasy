import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getOrCreateToken, setPlayerName, setGameId } from '../lib/session'

function generateCode() {
  var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  var code = ''
  for (var i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

export default function HomeView() {
  var navigate = useNavigate()
  var [createName, setCreateName] = useState('')
  var [creating, setCreating] = useState(false)
  var [createError, setCreateError] = useState('')
  var [joinName, setJoinName] = useState('')
  var [joinCode, setJoinCode] = useState('')
  var [joining, setJoining] = useState(false)
  var [joinError, setJoinError] = useState('')
  var [tab, setTab] = useState('create')

  async function handleCreate(e) {
    e.preventDefault()
    if (!createName.trim()) return
    setCreating(true)
    setCreateError('')
    try {
      var token = getOrCreateToken()
      var code = generateCode()
      var result = await supabase.from('games').insert({
        code: code,
        host_session_token: token,
        status: 'lobby',
        current_pick_number: 1,
        total_picks: 0,
        wc_season: 2026,
      }).select().single()
      if (result.error) throw result.error
      var game = result.data
      var playerResult = await supabase.from('game_players').insert({
        game_id: game.id,
        name: createName.trim(),
        session_token: token,
        draft_order: 1,
      })
      if (playerResult.error) throw playerResult.error
      setPlayerName(createName.trim())
      setGameId(game.id)
      navigate('/lobby/' + game.id)
    } catch (err) {
      setCreateError(err.message || 'Failed to create game')
    } finally {
      setCreating(false)
    }
  }

  async function handleJoin(e) {
    e.preventDefault()
    if (!joinName.trim() || !joinCode.trim()) return
    setJoining(true)
    setJoinError('')
    try {
      var token = getOrCreateToken()
      var code = joinCode.trim().toUpperCase()
      var gameResult = await supabase.from('games').select('*').eq('code', code).single()
      if (gameResult.error || !gameResult.data) throw new Error('Game not found. Check the code and try again.')
      var game = gameResult.data
      if (game.status !== 'lobby') throw new Error('This game has already started.')
      var existingResult = await supabase.from('game_players').select('id').eq('game_id', game.id).eq('session_token', token).single()
      if (!existingResult.data) {
        var othersResult = await supabase.from('game_players').select('draft_order').eq('game_id', game.id).order('draft_order', { ascending: false }).limit(1)
        var nextOrder = (othersResult.data && othersResult.data.length > 0) ? othersResult.data[0].draft_order + 1 : 2
        var insertResult = await supabase.from('game_players').insert({
          game_id: game.id,
          name: joinName.trim(),
          session_token: token,
          draft_order: nextOrder,
        })
        if (insertResult.error) throw insertResult.error
      }
      setPlayerName(joinName.trim())
      setGameId(game.id)
      navigate('/lobby/' + game.id)
    } catch (err) {
      setJoinError(err.message || 'Failed to join game')
    } finally {
      setJoining(false)
    }
  }

  return (
    <div className="page" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <div style={{ padding: '2.5rem 1.5rem 1rem', textAlign: 'center' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>⚽</div>
        <h1 style={{ color: 'var(--gold)', marginBottom: '0.25rem' }}>Copa Fantasy</h1>
        <p className="text-muted text-sm">World Cup 2026 Draft Game</p>
      </div>
      <div className="container" style={{ flex: 1, paddingTop: '1.5rem' }}>
        <div className="tabs" style={{ borderRadius: 'var(--radius)', marginBottom: '1.5rem', position: 'static' }}>
          <div className={'tab' + (tab === 'create' ? ' active' : '')} onClick={function() { setTab('create') }}>Create Game</div>
          <div className={'tab' + (tab === 'join' ? ' active' : '')} onClick={function() { setTab('join') }}>Join Game</div>
        </div>
        {tab === 'create' && (
          <div className="card">
            <h3 style={{ marginBottom: '1rem' }}>Create a New Game</h3>
            <form onSubmit={handleCreate}>
              <div style={{ marginBottom: '1rem' }}>
                <label className="text-sm text-muted" style={{ display: 'block', marginBottom: '0.375rem' }}>Your Name</label>
                <input className="input" type="text" placeholder="Enter your name" value={createName} onChange={function(e) { setCreateName(e.target.value) }} maxLength={24} autoFocus />
              </div>
              {createError && <div className="text-danger text-sm mb-2">{createError}</div>}
              <button className="btn btn-primary w-full btn-lg" type="submit" disabled={creating || !createName.trim()}>
                {creating ? 'Creating...' : 'Create Game'}
              </button>
            </form>
          </div>
        )}
        {tab === 'join' && (
          <div className="card">
            <h3 style={{ marginBottom: '1rem' }}>Join a Game</h3>
            <form onSubmit={handleJoin}>
              <div style={{ marginBottom: '0.75rem' }}>
                <label className="text-sm text-muted" style={{ display: 'block', marginBottom: '0.375rem' }}>Your Name</label>
                <input className="input" type="text" placeholder="Enter your name" value={joinName} onChange={function(e) { setJoinName(e.target.value) }} maxLength={24} autoFocus />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label className="text-sm text-muted" style={{ display: 'block', marginBottom: '0.375rem' }}>Game Code</label>
                <input className="input" type="text" placeholder="ABC123" value={joinCode} onChange={function(e) { setJoinCode(e.target.value.toUpperCase()) }} maxLength={6} style={{ letterSpacing: '0.1em', fontWeight: 700, fontSize: '1.25rem' }} />
              </div>
              {joinError && <div className="text-danger text-sm mb-2">{joinError}</div>}
              <button className="btn btn-primary w-full btn-lg" type="submit" disabled={joining || !joinName.trim() || !joinCode.trim()}>
                {joining ? 'Joining...' : 'Join Game'}
              </button>
            </form>
          </div>
        )}
        <div style={{ marginTop: '2rem' }}>
          <div className="section-label" style={{ marginBottom: '0.75rem' }}>How It Works</div>
          {[['Snake Draft','2 teams per pot x 4 pots = 8 teams'],['Pick Players','1 FWD + 1 MID + 1 DEF per team'],['Captain','Pick one player for 2x points'],['Score Points','Earn points throughout WC 2026']].map(function(item) {
            return (
              <div key={item[0]} className="flex gap-3 items-center" style={{ padding: '0.5rem 0' }}>
                <div>
                  <div className="text-sm font-semibold">{item[0]}</div>
                  <div className="text-xs text-muted">{item[1]}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
