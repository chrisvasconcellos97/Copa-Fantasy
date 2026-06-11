import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getOrCreateToken } from '../lib/session'
import { useGame } from '../hooks/useGame'
import { usePlayers } from '../hooks/usePlayers'
import { useDraft } from '../hooks/useDraft'
import { useNotifications } from '../hooks/useNotifications'
import { getCurrentPicker, getPotFromPickNumber } from '../lib/draft'
import TeamCard from '../components/TeamCard'
import ConfirmBar from '../components/ConfirmBar'
import SnakeOrderBar from '../components/SnakeOrderBar'
import HostDashboard from '../components/HostDashboard'
import PokeToast from '../components/PokeToast'
import PlayerCard from '../components/PlayerCard'
import CaptainGrid from '../components/CaptainGrid'

export default function DraftView() {
  const { gameId } = useParams()
  const navigate = useNavigate()
  const token = getOrCreateToken()

  const { game } = useGame(gameId)
  const { players } = usePlayers(gameId)
  const { picks } = useDraft(gameId)

  const [teams, setTeams] = useState([])
  const [allPlayers, setAllPlayers] = useState([])
  const [selectedTeam, setSelectedTeam] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [showHost, setShowHost] = useState(false)
  const [myPlayerPicks, setMyPlayerPicks] = useState([])
  const [selectingTeamId, setSelectingTeamId] = useState(null)
  const [selectingPosition, setSelectingPosition] = useState(null)
  const [captainPickId, setCaptainPickId] = useState(null)
  const [captainSubmitting, setCaptainSubmitting] = useState(false)

  const me = players.find(p => p.session_token === token)
  const isHost = game && game.host_session_token === token
  const { unread, dismiss } = useNotifications(me?.id)

  useEffect(() => {
    if (game && (game.status === 'tournament' || game.status === 'complete')) {
      navigate('/leaderboard/' + gameId)
    }
  }, [game, gameId, navigate])

  useEffect(() => {
    supabase.from('teams').select('*').then(({ data }) => setTeams(data || []))
  }, [])

  useEffect(() => {
    supabase.from('players').select('*').then(({ data }) => setAllPlayers(data || []))
  }, [])

  useEffect(() => {
    if (!me || !game || game.status !== 'selecting_players') return
    supabase.from('player_picks').select('*').eq('game_id', gameId).eq('game_player_id', me.id)
      .then(({ data }) => setMyPlayerPicks(data || []))

    const ch = supabase.channel('pplayer-' + me.id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'player_picks', filter: 'game_player_id=eq.' + me.id }, payload => {
        setMyPlayerPicks(prev => [...prev, payload.new])
      })
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [me, game, gameId])

  const currentPicker = game ? getCurrentPicker(picks, players, game.current_pick_number) : null
  const isMyTurn = currentPicker && me && currentPicker.id === me.id
  const currentPot = game ? getPotFromPickNumber(game.current_pick_number, players.length) : 1
  const currentPickerIndex = currentPicker ? players.findIndex(p => p.id === currentPicker.id) : -1

  const takenMap = useMemo(() => {
    const m = {}
    for (const pick of picks) {
      const player = players.find(p => p.id === pick.player_id)
      m[pick.team_api_id] = player ? player.name : '?'
    }
    return m
  }, [picks, players])

  const myDraftPicks = picks.filter(p => p.player_id === me?.id)

  const teamsByPot = useMemo(() => {
    const byPot = { 1: [], 2: [], 3: [], 4: [] }
    for (const t of teams) {
      if (byPot[t.pot]) byPot[t.pot].push(t)
    }
    return byPot
  }, [teams])

  async function confirmTeamPick() {
    if (!selectedTeam || !me || !isMyTurn) return
    setSubmitting(true)
    setError('')
    try {
      const pot = getPotFromPickNumber(game.current_pick_number, players.length)
      const { error: pickErr } = await supabase.from('draft_picks').insert({
        game_id: gameId,
        player_id: me.id,
        team_api_id: selectedTeam.api_id,
        pot,
        pick_number: game.current_pick_number
      })
      if (pickErr) throw pickErr

      const nextPick = game.current_pick_number + 1
      const totalPicks = players.length * 8
      let nextStatus = 'drafting_teams'
      if (nextPick > totalPicks) nextStatus = 'selecting_players'

      const { error: gameErr } = await supabase.from('games').update({
        current_pick_number: nextPick,
        status: nextStatus
      }).eq('id', gameId)
      if (gameErr) throw gameErr

      setSelectedTeam(null)
    } catch (e) {
      setError(e.message || 'Failed to submit pick')
    }
    setSubmitting(false)
  }

  async function handlePokePlayer(playerId) {
    await supabase.from('notifications').insert({
      game_id: gameId,
      game_player_id: playerId,
      type: 'poke',
      message: "It's your turn to pick!",
      read: false
    })
  }

  const getPicksForTeam = (teamApiId) => myPlayerPicks.filter(pp => {
    const dp = picks.find(dk => dk.id === pp.draft_pick_id)
    return dp && dp.team_api_id === teamApiId
  })

  const myTeamsNeedingPlayers = myDraftPicks.filter(dp => {
    const existing = getPicksForTeam(dp.team_api_id)
    return existing.length < 3
  })

  async function selectPlayer(player, teamApiId, position, draftPickId) {
    if (!me) return
    setSubmitting(true)
    setError('')
    try {
      const { error: e } = await supabase.from('player_picks').insert({
        game_id: gameId,
        game_player_id: me.id,
        draft_pick_id: draftPickId,
        player_api_id: player.api_id,
        position
      })
      if (e) throw e
      setSelectingTeamId(null)
      setSelectingPosition(null)
    } catch (e) {
      setError(e.message || 'Failed to select player')
    }
    setSubmitting(false)
  }

  useEffect(() => {
    if (!game || game.status !== 'selecting_players' || !me || players.length === 0) return
    const checkAllDone = async () => {
      const { data: allPicks } = await supabase.from('player_picks').select('*').eq('game_id', gameId)
      const expected = picks.length * 3
      if (allPicks && allPicks.length >= expected) {
        await supabase.from('games').update({ status: 'selecting_captain' }).eq('id', gameId)
      }
    }
    if (myPlayerPicks.length > 0) checkAllDone()
  }, [myPlayerPicks, game, picks, gameId, me, players])

  async function submitCaptain() {
    if (!captainPickId || !me) return
    setCaptainSubmitting(true)
    setError('')
    try {
      const { error: e } = await supabase.from('captain_picks').insert({
        game_id: gameId,
        game_player_id: me.id,
        player_pick_id: captainPickId
      })
      if (e) throw e
      const { data: captains } = await supabase.from('captain_picks').select('*').eq('game_id', gameId)
      if (captains && captains.length >= players.length) {
        await supabase.from('games').update({ status: 'tournament' }).eq('id', gameId)
      }
    } catch (e) {
      setError(e.message || 'Failed to submit captain')
    }
    setCaptainSubmitting(false)
  }

  if (!game) return <div className="loading-screen"><div className="spinner" /><span>Loading draft...</span></div>

  if (game.status === 'selecting_captain') {
    return (
      <div className="view">
        <div className="phase-header">
          <div className="phase-title">Choose Your Captain</div>
          <div className="phase-sub">2x points multiplier on all their scores</div>
        </div>
        {error && <div className="error-msg">{error}</div>}
        <CaptainGrid playerPicks={myPlayerPicks} captainPickId={captainPickId} onSelectCaptain={(pp) => setCaptainPickId(pp.id)} />
        <button className="btn-primary" onClick={submitCaptain} disabled={!captainPickId || captainSubmitting}>
          {captainSubmitting ? 'Saving...' : 'Confirm Captain'}
        </button>
      </div>
    )
  }

  if (game.status === 'selecting_players') {
    const playersForTeam = selectingTeamId
      ? allPlayers.filter(p => p.team_api_id === selectingTeamId && p.position !== 'GK')
      : []

    return (
      <div className="view">
        <div className="phase-header">
          <div className="phase-title">Select Players</div>
          <div className="phase-sub">Pick 1 FWD, 1 MID, 1 DEF per team</div>
        </div>
        {error && <div className="error-msg">{error}</div>}
        {!selectingTeamId ? (
          <div>
            {myTeamsNeedingPlayers.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">All players selected! Waiting for others...</div>
              </div>
            ) : (
              myDraftPicks.map(dp => {
                const team = teams.find(t => t.api_id === dp.team_api_id)
                const existing = getPicksForTeam(dp.team_api_id)
                const positions = ['FWD', 'MID', 'DEF']
                if (!team) return null
                return (
                  <div key={dp.id} className="card">
                    <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {team.logo_url && <img src={team.logo_url} alt={team.name} style={{ width: 20, height: 20, objectFit: 'contain' }} />}
                      {team.name}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {positions.map(pos => {
                        const pick = existing.find(pp => pp.position === pos)
                        return (
                          <button key={pos}
                            className={'squad-slot ' + pos.toLowerCase()}
                            style={{ flex: 1, padding: '8px 4px', cursor: pick ? 'default' : 'pointer', minHeight: 48, fontSize: 11 }}
                            onClick={() => { if (!pick) { setSelectingTeamId(dp.team_api_id); setSelectingPosition(pos) } }}
                            disabled={!!pick}
                          >
                            <div style={{ fontWeight: 700 }}>{pos}</div>
                            {pick ? <div style={{ fontSize: 10, marginTop: 2 }}>{pick.player_api_id}</div>
                                  : <div style={{ fontSize: 10, marginTop: 2, color: 'var(--gold)' }}>+ Pick</div>}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        ) : (
          <div>
            <button className="btn-secondary" style={{ marginBottom: 12, width: 'auto', padding: '8px 16px' }}
              onClick={() => { setSelectingTeamId(null); setSelectingPosition(null) }}>
              Back
            </button>
            <div className="card-title">Pick {selectingPosition} for {teams.find(t => t.api_id === selectingTeamId)?.name}</div>
            <div className="players-grid">
              {playersForTeam.filter(p => p.position === selectingPosition).length > 0
                ? playersForTeam.filter(p => p.position === selectingPosition).map(p => (
                    <PlayerCard key={p.id} player={p} showPosition
                      selected={myPlayerPicks.some(pp => pp.player_api_id === p.api_id)}
                      onClick={() => {
                        const dp = myDraftPicks.find(d => d.team_api_id === selectingTeamId)
                        if (dp && !myPlayerPicks.some(pp => pp.player_api_id === p.api_id)) selectPlayer(p, selectingTeamId, selectingPosition, dp.id)
                      }} />
                  ))
                : playersForTeam.map(p => (
                    <PlayerCard key={p.id} player={p} showPosition
                      onClick={() => {
                        const dp = myDraftPicks.find(d => d.team_api_id === selectingTeamId)
                        if (dp) selectPlayer(p, selectingTeamId, selectingPosition, dp.id)
                      }} />
                  ))
              }
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="view">
      {unread.map(n => (
        <PokeToast key={n.id} message={n.message} onDismiss={() => dismiss(n.id)} />
      ))}
      <div className="phase-header">
        <div className="phase-title">Team Draft</div>
        <div className="phase-sub">Pick #{game.current_pick_number} of {game.total_picks} - Pot {currentPot}</div>
      </div>
      <SnakeOrderBar players={players} currentPickerIndex={currentPickerIndex} myPlayerId={me?.id} />
      {isMyTurn
        ? <div className="turn-banner">Your turn to pick!</div>
        : <div className="waiting-banner">Waiting for {currentPicker?.name || '...'} to pick...</div>
      }
      {error && <div className="error-msg">{error}</div>}
      {isHost && (
        <button className="btn-secondary" style={{ marginBottom: 12, width: 'auto', padding: '6px 14px', fontSize: 12 }}
          onClick={() => setShowHost(!showHost)}>
          {showHost ? 'Hide' : 'Show'} Host View
        </button>
      )}
      {showHost && isHost && (
        <HostDashboard players={players} picks={picks} currentPicker={currentPicker} onPoke={handlePokePlayer} teams={teams} />
      )}
      {[1, 2, 3, 4].map(pot => {
        const potTeams = teamsByPot[pot] || []
        if (pot !== currentPot && !isHost) return null
        return (
          <div key={pot} className="pot-section">
            <div className="pot-title">Pot {pot}</div>
            <div className="teams-grid">
              {potTeams.map(team => {
                const taken = !!takenMap[team.api_id]
                return (
                  <TeamCard key={team.api_id} team={team}
                    selected={selectedTeam?.api_id === team.api_id}
                    taken={taken} takenBy={takenMap[team.api_id]}
                    disabled={!isMyTurn || team.pot !== currentPot}
                    onClick={() => {
                      if (!taken && isMyTurn && team.pot === currentPot) {
                        setSelectedTeam(selectedTeam?.api_id === team.api_id ? null : team)
                      }
                    }} />
                )
              })}
            </div>
          </div>
        )
      })}
      <ConfirmBar selectedTeam={selectedTeam} onConfirm={confirmTeamPick} onCancel={() => setSelectedTeam(null)} />
    </div>
  )
}
