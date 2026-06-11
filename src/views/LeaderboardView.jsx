import React, { useEffect, useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { getOrCreateToken } from '../lib/session.js'
import { getTeamByCode, RESULT_TYPES, BONUS_TYPES } from '../lib/constants.js'

export default function LeaderboardView() {
  const { gameId } = useParams()
  const token = getOrCreateToken()
  const [game, setGame] = useState(null)
  const [players, setPlayers] = useState([])
  const [picks, setPicks] = useState([])
  const [matchResults, setMatchResults] = useState([])
  const [heroBonuses, setHeroBonuses] = useState([])
  const [expanded, setExpanded] = useState({})

  // Host controls state
  const [resultTeam, setResultTeam] = useState('')
  const [resultType, setResultType] = useState('group_win')
  const [resultPoints, setResultPoints] = useState(3)
  const [resultDate, setResultDate] = useState('')

  const [bonusPickId, setBonusPickId] = useState('')
  const [bonusType, setBonusType] = useState('goal')
  const [bonusPoints, setBonusPoints] = useState(5)
  const [bonusDate, setBonusDate] = useState('')

  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const [{ data: g }, { data: ps }, { data: pks }, { data: mr }, { data: hb }] = await Promise.all([
      supabase.from('games').select().eq('id', gameId).single(),
      supabase.from('game_players').select().eq('game_id', gameId),
      supabase.from('draft_picks').select().eq('game_id', gameId),
      supabase.from('match_results').select(),
      supabase.from('hero_bonuses').select().eq('game_id', gameId),
    ])
    setGame(g)
    setPlayers(ps || [])
    setPicks(pks || [])
    setMatchResults(mr || [])
    setHeroBonuses(hb || [])
  }, [gameId])

  useEffect(() => {
    load()
    const ch = supabase.channel(`lb-${gameId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'match_results' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hero_bonuses', filter: `game_id=eq.${gameId}` }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'draft_picks', filter: `game_id=eq.${gameId}` }, load)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [gameId])

  const isHost = game?.host_session_token === token

  function calcPlayerScore(player) {
    const playerPicks = picks.filter(p => p.player_id === player.id)
    let score = 0
    for (const pick of playerPicks) {
      const teamResults = matchResults.filter(r => r.team_code === pick.team_code)
      score += teamResults.reduce((s, r) => s + (r.points || 0), 0)
      const pickBonuses = heroBonuses.filter(b => b.pick_id === pick.id)
      score += pickBonuses.reduce((s, b) => s + (b.points || 0), 0)
    }
    return score
  }

  function calcTeamScore(teamCode) {
    return matchResults.filter(r => r.team_code === teamCode).reduce((s, r) => s + (r.points || 0), 0)
  }

  const sortedPlayers = [...players].sort((a, b) => calcPlayerScore(b) - calcPlayerScore(a))

  // All drafted team codes for this game
  const allDraftedTeams = [...new Set(picks.map(p => p.team_code))]

  async function addResult() {
    if (!resultTeam) return
    setSaving(true)
    await supabase.from('match_results').insert({
      team_code: resultTeam,
      result_type: resultType,
      points: Number(resultPoints),
      match_date: resultDate || null,
    })
    setSaving(false)
  }

  async function addBonus() {
    if (!bonusPickId) return
    setSaving(true)
    await supabase.from('hero_bonuses').insert({
      game_id: gameId,
      pick_id: bonusPickId,
      bonus_type: bonusType,
      points: Number(bonusPoints),
      match_date: bonusDate || null,
    })
    setSaving(false)
  }

  function onResultTypeChange(val) {
    setResultType(val)
    const rt = RESULT_TYPES.find(r => r.value === val)
    if (rt) setResultPoints(rt.defaultPoints)
  }

  function onBonusTypeChange(val) {
    setBonusType(val)
    const bt = BONUS_TYPES.find(b => b.value === val)
    if (bt) setBonusPoints(bt.defaultPoints)
  }

  return (
    <div className="page">
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1 className="brand">Leaderboard</h1>
        <p className="subtitle">Copa Fantasy 2026</p>
      </div>

      {/* Rankings */}
      <div style={{ marginBottom: '2rem' }}>
        {sortedPlayers.map((player, rank) => {
          const score = calcPlayerScore(player)
          const playerPicks = picks.filter(p => p.player_id === player.id).sort((a, b) => a.pot - b.pot)
          const isExpanded = expanded[player.id]
          const isMe = player.session_token === token

          return (
            <div key={player.id} style={{ marginBottom: '0.75rem' }}>
              <button
                onClick={() => setExpanded(e => ({ ...e, [player.id]: !e[player.id] }))}
                style={{
                  width: '100%', background: 'var(--bg-card)', border: 'var(--border)',
                  borderRadius: isExpanded ? '12px 12px 0 0' : '12px',
                  padding: '1rem 1.25rem', cursor: 'pointer', fontFamily: 'var(--font)',
                  color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.75rem',
                  textAlign: 'left', transition: 'background 0.15s',
                }}
              >
                <span style={{
                  fontSize: '1.1rem', fontWeight: 900, color: rank === 0 ? '#ffd700' : rank === 1 ? '#c0c0c0' : rank === 2 ? '#cd7f32' : 'var(--text-muted)',
                  minWidth: 28,
                }}>
                  {rank === 0 ? '🥇' : rank === 1 ? '🥈' : rank === 2 ? '🥉' : `#${rank + 1}`}
                </span>
                <span style={{ fontWeight: 700, fontSize: '1rem', flex: 1 }}>{player.name}</span>
                {isMe && <span className="tag">You</span>}
                {player.session_token === game?.host_session_token && <span className="tag tag-blue">Host</span>}
                <span style={{ fontWeight: 900, fontSize: '1.2rem', color: 'var(--accent)', marginLeft: 'auto' }}>{score} pts</span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{isExpanded ? '▲' : '▼'}</span>
              </button>

              {isExpanded && (
                <div style={{
                  background: 'rgba(15,23,41,0.8)', border: 'var(--border)',
                  borderTop: 'none', borderRadius: '0 0 12px 12px', padding: '1rem 1.25rem',
                }}>
                  {playerPicks.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No picks yet.</p>}
                  {playerPicks.map(pick => {
                    const team = getTeamByCode(pick.team_code)
                    const teamScore = calcTeamScore(pick.team_code)
                    const pickBonuses = heroBonuses.filter(b => b.pick_id === pick.id)
                    const bonusTotal = pickBonuses.reduce((s, b) => s + b.points, 0)
                    return (
                      <div key={pick.id} style={{
                        display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                        padding: '0.6rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)',
                      }}>
                        <span style={{ fontSize: '1.6rem' }}>{team?.flag}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{team?.name}</div>
                          {pick.hero_player_name && (
                            <div style={{ fontSize: '0.78rem', color: 'var(--accent)' }}>⭐ {pick.hero_player_name}</div>
                          )}
                          {pickBonuses.length > 0 && (
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                              Hero bonuses: {pickBonuses.map(b => `${b.bonus_type} (${b.points > 0 ? '+' : ''}${b.points})`).join(', ')}
                            </div>
                          )}
                        </div>
                        <div style={{ textAlign: 'right', fontSize: '0.85rem' }}>
                          <div style={{ color: 'var(--accent)', fontWeight: 700 }}>+{teamScore}</div>
                          {bonusTotal !== 0 && <div style={{ color: bonusTotal > 0 ? '#68d391' : '#fc8181', fontSize: '0.75rem' }}>{bonusTotal > 0 ? '+' : ''}{bonusTotal} hero</div>}
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Pot {pick.pot}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Host Controls */}
      {isHost && (
        <div className="card" style={{ marginTop: '2rem' }}>
          <h2 style={{ color: 'var(--accent)', marginBottom: '1.5rem' }}>🎮 Host Controls</h2>

          <div style={{ marginBottom: '1.5rem' }}>
            <p className="section-heading" style={{ marginBottom: '1rem' }}>Add Team Result</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">Team</label>
                <select className="input" value={resultTeam} onChange={e => setResultTeam(e.target.value)}>
                  <option value="">Select team...</option>
                  {allDraftedTeams.map(code => {
                    const team = getTeamByCode(code)
                    return <option key={code} value={code}>{team?.flag} {team?.name}</option>
                  })}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Result</label>
                <select className="input" value={resultType} onChange={e => onResultTypeChange(e.target.value)}>
                  {RESULT_TYPES.map(r => <option key={r.value} value={r.value}>{r.label} (+{r.defaultPoints})</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Points</label>
                <input className="input" type="number" value={resultPoints} onChange={e => setResultPoints(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Date (optional)</label>
                <input className="input" type="date" value={resultDate} onChange={e => setResultDate(e.target.value)} />
              </div>
            </div>
            <button className="btn btn-primary" onClick={addResult} disabled={saving || !resultTeam}>
              Add Result
            </button>
          </div>

          <hr className="divider" />

          <div>
            <p className="section-heading" style={{ marginBottom: '1rem' }}>Add Hero Bonus</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">Hero Pick</label>
                <select className="input" value={bonusPickId} onChange={e => setBonusPickId(e.target.value)}>
                  <option value="">Select pick...</option>
                  {picks.filter(p => p.hero_player_name).map(p => {
                    const player = players.find(pl => pl.id === p.player_id)
                    const team = getTeamByCode(p.team_code)
                    return <option key={p.id} value={p.id}>{player?.name} — {p.hero_player_name} ({team?.name})</option>
                  })}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Bonus Type</label>
                <select className="input" value={bonusType} onChange={e => onBonusTypeChange(e.target.value)}>
                  {BONUS_TYPES.map(b => <option key={b.value} value={b.value}>{b.label} ({b.defaultPoints > 0 ? '+' : ''}{b.defaultPoints})</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Points</label>
                <input className="input" type="number" value={bonusPoints} onChange={e => setBonusPoints(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Date (optional)</label>
                <input className="input" type="date" value={bonusDate} onChange={e => setBonusDate(e.target.value)} />
              </div>
            </div>
            <button className="btn btn-primary" onClick={addBonus} disabled={saving || !bonusPickId}>
              Add Bonus
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
