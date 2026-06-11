import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { getOrCreateToken } from '../lib/session.js'
import { POTS, getTeamByCode } from '../lib/constants.js'
import HeroModal from '../components/HeroModal.jsx'

function getSnakeOrder(players, round) {
  const ordered = [...players].sort((a, b) => a.draft_order - b.draft_order)
  return round % 2 === 0 ? ordered : [...ordered].reverse()
}

export default function DraftView() {
  const { gameId } = useParams()
  const navigate = useNavigate()
  const token = getOrCreateToken()
  const [game, setGame] = useState(null)
  const [players, setPlayers] = useState([])
  const [picks, setPicks] = useState([])
  const [heroPickId, setHeroPickId] = useState(null)
  const [heroTeamCode, setHeroTeamCode] = useState(null)

  const loadPicks = useCallback(async () => {
    const { data } = await supabase.from('draft_picks').select().eq('game_id', gameId)
    setPicks(data || [])
  }, [gameId])

  useEffect(() => {
    supabase.from('games').select().eq('id', gameId).single().then(({ data }) => setGame(data))
    supabase.from('game_players').select().eq('game_id', gameId).then(({ data }) => setPlayers(data || []))
    loadPicks()

    const ch = supabase.channel(`draft-${gameId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${gameId}` }, ({ new: g }) => {
        setGame(g)
        if (g.status === 'tournament' || g.status === 'complete') navigate(`/leaderboard/${gameId}`)
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'draft_picks', filter: `game_id=eq.${gameId}` }, () => loadPicks())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'draft_picks', filter: `game_id=eq.${gameId}` }, () => loadPicks())
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [gameId])

  if (!game || players.length === 0) return (
    <div className="page flex items-center justify-center">
      <div className="spinner" />
    </div>
  )

  const totalPicks = game.total_picks || players.length * 4
  const currentPickNumber = game.current_pick_number || 0
  const currentRound = Math.floor(currentPickNumber / players.length)
  const currentPot = currentRound + 1
  const potPlayers = getSnakeOrder(players, currentRound)
  const posInRound = currentPickNumber % players.length
  const currentPlayer = potPlayers[posInRound]
  const myPlayer = players.find(p => p.session_token === token)
  const isMyTurn = currentPlayer?.session_token === token
  const draftComplete = currentPickNumber >= totalPicks
  const potTeams = POTS[Math.min(currentPot, 4)] || []
  const pickedTeamsInPot = picks.filter(p => p.pot === currentPot).map(p => p.team_code)

  async function pickTeam(teamCode) {
    if (!isMyTurn) return
    const newPickNumber = currentPickNumber + 1
    const { data: pick } = await supabase.from('draft_picks').insert({
      game_id: gameId,
      player_id: myPlayer.id,
      team_code: teamCode,
      pot: currentPot,
      pick_number: newPickNumber,
    }).select().single()
    await supabase.from('games').update({ current_pick_number: newPickNumber }).eq('id', gameId)
    if (newPickNumber >= totalPicks) {
      await supabase.from('games').update({ status: 'tournament' }).eq('id', gameId)
    }
    setHeroPickId(pick.id)
    setHeroTeamCode(teamCode)
  }

  async function confirmHero(heroName) {
    await supabase.from('draft_picks').update({ hero_player_name: heroName }).eq('id', heroPickId)
    setHeroPickId(null)
    setHeroTeamCode(null)
  }

  const myPicks = myPlayer ? picks.filter(p => p.player_id === myPlayer.id).sort((a, b) => a.pot - b.pot) : []

  return (
    <div className="page">
      {heroPickId && <HeroModal teamCode={heroTeamCode} onConfirm={confirmHero} />}

      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h1 className="page-title" style={{ textAlign: 'left', fontSize: '1.8rem' }}>Draft</h1>
          {!draftComplete && <span className="badge badge-accent">Pot {currentPot} / 4</span>}
        </div>

        {!draftComplete && (
          <div className="card text-center" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
            {isMyTurn
              ? <p style={{ color: 'var(--accent)', fontWeight: 700, fontSize: '1.05rem' }}>⚡ Your pick!</p>
              : <p style={{ color: 'var(--text-secondary)' }}>Waiting for <strong style={{ color: 'var(--text-primary)' }}>{currentPlayer?.name}</strong>...</p>
            }
          </div>
        )}

        {/* Snake order bar */}
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          {potPlayers.map((p, i) => {
            const isActive = i === posInRound && !draftComplete
            const isMe = p.session_token === token
            return (
              <div key={p.id} style={{
                padding: '0.3rem 0.7rem', borderRadius: 6, fontSize: '0.8rem', fontWeight: isActive ? 700 : 400,
                background: isActive ? 'var(--accent)' : 'var(--bg-card)',
                color: isActive ? '#000' : isMe ? 'var(--accent)' : 'var(--text-secondary)',
                border: isMe && !isActive ? '1px solid var(--accent-dim)' : '1px solid rgba(255,255,255,0.08)',
              }}>
                {i + 1}. {p.name}
              </div>
            )
          })}
        </div>

        {draftComplete ? (
          <div className="card text-center" style={{ padding: '3rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏆</div>
            <h2 className="text-accent" style={{ marginBottom: '1rem' }}>Draft Complete!</h2>
            <button className="btn btn-primary btn-lg" onClick={() => navigate(`/leaderboard/${gameId}`)}>
              View Leaderboard →
            </button>
          </div>
        ) : (
          <>
            <h2 className="text-accent" style={{ marginBottom: '1rem' }}>Pot {currentPot} — Pick a Team</h2>
            <div className="grid-4">
              {potTeams.map(team => {
                const taken = pickedTeamsInPot.includes(team.code)
                const whoTook = taken ? players.find(p => picks.find(pk => pk.team_code === team.code && pk.pot === currentPot && pk.player_id === p.id)) : null
                return (
                  <button
                    key={team.code}
                    className={`team-card${taken ? ' other-pick' : ''}${!taken && isMyTurn ? '' : ''}`}
                    disabled={taken || !isMyTurn}
                    onClick={() => pickTeam(team.code)}
                    style={{ cursor: taken || !isMyTurn ? 'default' : 'pointer' }}
                  >
                    <span style={{ fontSize: '2.2rem' }}>{team.flag}</span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{team.name}</span>
                    {taken && whoTook && <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>by {whoTook.name}</span>}
                    {taken && !whoTook && <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Taken</span>}
                  </button>
                )
              })}
            </div>
          </>
        )}

        {myPicks.length > 0 && (
          <div className="card" style={{ marginTop: '2rem' }}>
            <h2 className="text-accent" style={{ marginBottom: '0.75rem' }}>My Picks</h2>
            {myPicks.map(pick => {
              const team = getTeamByCode(pick.team_code)
              return (
                <div key={pick.id} style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)'
                }}>
                  <span style={{ fontSize: '1.5rem' }}>{team?.flag}</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{team?.name}</div>
                    {pick.hero_player_name
                      ? <div style={{ fontSize: '0.75rem', color: 'var(--accent)' }}>⭐ {pick.hero_player_name}</div>
                      : <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>No hero yet</div>
                    }
                  </div>
                  <span className="badge badge-accent" style={{ marginLeft: 'auto' }}>Pot {pick.pot}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
