import React, { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useGame } from '../hooks/useGame'
import { usePlayers } from '../hooks/usePlayers'
import { useDraft } from '../hooks/useDraft'
import { useNotifications } from '../hooks/useNotifications'
import TeamCard from '../components/TeamCard'
import ConfirmBar from '../components/ConfirmBar'
import SnakeOrderBar from '../components/SnakeOrderBar'
import HostDashboard from '../components/HostDashboard'
import PlayerCard from '../components/PlayerCard'
import CaptainGrid from '../components/CaptainGrid'
import PokeToast from '../components/PokeToast'
import { supabase } from '../lib/supabase'
import { getOrCreateToken } from '../lib/session'
import { getCurrentPicker, getPotFromPickNumber } from '../lib/draft'
import { FALLBACK_POTS } from '../lib/constants'

const POSITIONS = ['FWD', 'MID', 'DEF']

export default function DraftView() {
  const { gameId } = useParams()
  const navigate = useNavigate()
  const { game, loading: gameLoading } = useGame(gameId)
  const { players, loading: playersLoading } = usePlayers(gameId)
  const { picks, loading: picksLoading } = useDraft(gameId)
  const myToken = getOrCreateToken()

  const [teams, setTeams] = useState([])
  const [selectedTeam, setSelectedTeam] = useState(null)
  const [confirming, setConfirming] = useState(false)

  const [dbPlayers, setDbPlayers] = useState([])
  const [playerPicks, setPlayerPicks] = useState([])
  const [selectedPlayerByPos, setSelectedPlayerByPos] = useState({})
  const [activeTeamPick, setActiveTeamPick] = useState(null)
  const [activePosition, setActivePosition] = useState('FWD')
  const [savingPlayer, setSavingPlayer] = useState(false)

  const [captainPickId, setCaptainPickId] = useState(null)
  const [savingCaptain, setSavingCaptain] = useState(false)

  const myPlayer = players.find(function(p) { return p.session_token === myToken })
  const { unread, dismiss } = useNotifications(myPlayer ? myPlayer.id : null)
  const isHost = game && game.host_session_token === myToken

  useEffect(function() {
    if (game && (game.status === 'tournament' || game.status === 'complete')) {
      navigate('/leaderboard/' + gameId, { replace: true })
    }
  }, [game, gameId, navigate])

  useEffect(function() {
    supabase.from('teams').select('*').then(function(result) {
      var data = result.data
      if (data && data.length > 0) {
        setTeams(data)
      } else {
        var fallback = []
        Object.entries(FALLBACK_POTS).forEach(function(entry) {
          var pot = entry[0]
          var names = entry[1]
          names.forEach(function(name, idx) {
            fallback.push({ api_id: 'fallback-' + pot + '-' + idx, name: name, pot: parseInt(pot), logo_url: null })
          })
        })
        setTeams(fallback)
      }
    })
  }, [])

  useEffect(function() {
    if (game && (game.status === 'selecting_players' || game.status === 'selecting_captain')) {
      supabase.from('players').select('*').then(function(result) { setDbPlayers(result.data || []) })
    }
  }, [game && game.status])

  useEffect(function() {
    if (!gameId) return
    supabase.from('player_picks').select('*').eq('game_id', gameId).then(function(result) {
      setPlayerPicks(result.data || [])
    })
  }, [gameId, game && game.status])

  useEffect(function() {
    if (!myPlayer) return
    supabase.from('captain_picks').select('*').eq('game_id', gameId).eq('game_player_id', myPlayer.id).single().then(function(result) {
      if (result.data) setCaptainPickId(result.data.player_pick_id)
    })
  }, [gameId, myPlayer && myPlayer.id])

  var currentPicker = useMemo(function() {
    if (!game || !players.length) return null
    return getCurrentPicker(picks, players, game.current_pick_number)
  }, [game, picks, players])

  var isMyTurn = currentPicker && currentPicker.session_token === myToken

  var currentPickerIndex = useMemo(function() {
    if (!currentPicker) return -1
    var sorted = players.slice().sort(function(a, b) { return a.draft_order - b.draft_order })
    return sorted.findIndex(function(p) { return p.id === currentPicker.id })
  }, [currentPicker, players])

  var takenByMap = useMemo(function() {
    var map = {}
    picks.forEach(function(pick) {
      var player = players.find(function(p) { return p.id === pick.player_id })
      map[pick.team_api_id] = player ? player.name : 'Someone'
    })
    return map
  }, [picks, players])

  var myPickIds = useMemo(function() {
    if (!myPlayer) return new Set()
    return new Set(picks.filter(function(p) { return p.player_id === myPlayer.id }).map(function(p) { return p.team_api_id }))
  }, [picks, myPlayer])

  var teamsByPot = useMemo(function() {
    var grouped = { 1: [], 2: [], 3: [], 4: [] }
    teams.forEach(function(t) {
      var pot = t.pot || 1
      if (grouped[pot]) grouped[pot].push(t)
    })
    return grouped
  }, [teams])

  var currentPot = game ? getPotFromPickNumber(game.current_pick_number, players.length || 1) : 1

  async function handleConfirmTeamPick() {
    if (!selectedTeam || !isMyTurn || confirming) return
    setConfirming(true)
    try {
      await supabase.from('draft_picks').insert({
        game_id: gameId,
        player_id: myPlayer.id,
        team_api_id: selectedTeam.api_id,
        pot: selectedTeam.pot,
        pick_number: game.current_pick_number,
      })
      var nextPick = game.current_pick_number + 1
      var totalPicks = game.total_picks || players.length * 8
      if (nextPick > totalPicks) {
        await supabase.from('games').update({ status: 'selecting_players', current_pick_number: nextPick }).eq('id', gameId)
      } else {
        await supabase.from('games').update({ current_pick_number: nextPick }).eq('id', gameId)
      }
      setSelectedTeam(null)
    } finally {
      setConfirming(false)
    }
  }

  var myPicks = useMemo(function() {
    if (!myPlayer) return []
    return picks.filter(function(p) { return p.player_id === myPlayer.id }).sort(function(a, b) { return a.pick_number - b.pick_number })
  }, [picks, myPlayer])

  useEffect(function() {
    if (!game || game.status !== 'selecting_players') return
    var needsPlayers = myPicks.find(function(pick) {
      var pp = playerPicks.filter(function(p) { return p.draft_pick_id === pick.id })
      return pp.length < 3
    })
    if (needsPlayers && (!activeTeamPick || activeTeamPick.id !== needsPlayers.id)) {
      setActiveTeamPick(needsPlayers)
      setActivePosition('FWD')
      setSelectedPlayerByPos({})
    }
  }, [myPicks, playerPicks, game && game.status])

  var teamPlayers = useMemo(function() {
    if (!activeTeamPick) return []
    return dbPlayers.filter(function(p) { return p.team_api_id === activeTeamPick.team_api_id })
  }, [dbPlayers, activeTeamPick])

  var playersForPosition = useMemo(function() {
    return teamPlayers.filter(function(p) { return p.position === activePosition })
  }, [teamPlayers, activePosition])

  var pickedPlayerApiIds = useMemo(function() {
    return new Set(playerPicks.map(function(pp) { return pp.player_api_id }))
  }, [playerPicks])

  async function handleSavePlayer() {
    if (!activeTeamPick || !myPlayer || savingPlayer) return
    var selected = selectedPlayerByPos[activePosition]
    if (!selected) return
    setSavingPlayer(true)
    try {
      await supabase.from('player_picks').insert({
        game_id: gameId,
        game_player_id: myPlayer.id,
        draft_pick_id: activeTeamPick.id,
        player_api_id: selected.api_id,
        position: activePosition,
      })
      var refreshed = await supabase.from('player_picks').select('*').eq('game_id', gameId)
      setPlayerPicks(refreshed.data || [])
      var nextPos = POSITIONS[POSITIONS.indexOf(activePosition) + 1]
      if (nextPos) {
        setActivePosition(nextPos)
        setSelectedPlayerByPos(function(prev) {
          var next = Object.assign({}, prev)
          next[activePosition] = undefined
          return next
        })
      } else {
        setSelectedPlayerByPos({})
        setActivePosition('FWD')
        var allPicks = await supabase.from('player_picks').select('*').eq('game_id', gameId).eq('game_player_id', myPlayer.id)
        var totalNeeded = myPicks.length * 3
        if (allPicks.data && allPicks.data.length >= totalNeeded) {
          var allPlayerPicks = await supabase.from('player_picks').select('*').eq('game_id', gameId)
          var neededTotal = picks.length * 3
          if (allPlayerPicks.data && allPlayerPicks.data.length >= neededTotal) {
            await supabase.from('games').update({ status: 'selecting_captain' }).eq('id', gameId)
          }
        }
      }
    } finally {
      setSavingPlayer(false)
    }
  }

  async function handleSelectCaptain(pp) {
    if (!myPlayer || savingCaptain) return
    setSavingCaptain(true)
    try {
      await supabase.from('captain_picks').upsert({
        game_id: gameId,
        game_player_id: myPlayer.id,
        player_pick_id: pp.id,
      }, { onConflict: 'game_id,game_player_id' })
      setCaptainPickId(pp.id)
      var allCaptains = await supabase.from('captain_picks').select('*').eq('game_id', gameId)
      if (allCaptains.data && allCaptains.data.length >= players.length) {
        await supabase.from('games').update({ status: 'tournament' }).eq('id', gameId)
      }
    } finally {
      setSavingCaptain(false)
    }
  }

  async function handlePoke(targetPlayer) {
    await supabase.from('notifications').insert({
      game_id: gameId,
      game_player_id: targetPlayer.id,
      type: 'poke',
      message: (myPlayer ? myPlayer.name : 'Someone') + ' is poking you — it\'s your turn to pick!',
      read: false,
    })
  }

  if (gameLoading || playersLoading || picksLoading) {
    return React.createElement('div', { className: 'loader' }, React.createElement('div', { className: 'spinner' }))
  }

  if (!game) {
    return (
      <div className="page container" style={{ paddingTop: '2rem' }}>
        <div className="empty-state"><div className="icon">😕</div><div>Game not found</div></div>
      </div>
    )
  }

  if (game.status === 'selecting_captain') {
    var myPlayerPicks = playerPicks.filter(function(pp) { return pp.game_player_id === (myPlayer ? myPlayer.id : null) })
    return (
      <div className="page">
        <div style={{ padding: '1rem', borderBottom: '1px solid var(--line)' }}>
          <h3>Captain Selection</h3>
          <p className="text-sm text-muted">This player earns 2x all their points</p>
        </div>
        <div style={{ paddingTop: '1rem', paddingBottom: '6rem' }}>
          <CaptainGrid
            playerPicks={myPlayerPicks}
            captainPickId={captainPickId}
            onSelectCaptain={handleSelectCaptain}
            players={dbPlayers}
          />
          {captainPickId && (
            <div style={{ padding: '1rem' }}>
              <div className="card card-gold text-center">
                <div className="text-sm text-gold font-semibold">Captain selected!</div>
                <div className="text-xs text-muted mt-1">Waiting for others...</div>
              </div>
            </div>
          )}
        </div>
        {unread.map(function(n) { return <PokeToast key={n.id} message={n.message} onDismiss={function() { dismiss(n.id) }} /> })}
      </div>
    )
  }

  if (game.status === 'selecting_players') {
    var activeTeamInfo = teams.find(function(t) { return t.api_id === (activeTeamPick ? activeTeamPick.team_api_id : null) })
    var alreadyPicked = activeTeamPick ? playerPicks.filter(function(pp) { return pp.draft_pick_id === activeTeamPick.id }) : []
    var pickedPositions = new Set(alreadyPicked.map(function(pp) { return pp.position }))
    var allDone = myPicks.length > 0 && myPicks.every(function(pick) {
      var pp = playerPicks.filter(function(p) { return p.draft_pick_id === pick.id })
      return pp.length >= 3
    })

    return (
      <div className="page">
        <div style={{ padding: '1rem', borderBottom: '1px solid var(--line)' }}>
          <h3>Select Your Players</h3>
          <p className="text-sm text-muted">1 FWD + 1 MID + 1 DEF per team</p>
        </div>
        {allDone ? (
          <div className="container" style={{ paddingTop: '2rem' }}>
            <div className="card card-gold text-center">
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>All done!</div>
              <div className="text-sm text-muted mt-1">Waiting for others to finish...</div>
            </div>
          </div>
        ) : (
          <>
            {activeTeamPick && (
              <div style={{ padding: '0.75rem 1rem', background: 'var(--navy-2)', borderBottom: '1px solid var(--line)' }}>
                <div className="flex items-center gap-2 mb-2">
                  {activeTeamInfo && activeTeamInfo.logo_url && (
                    <img src={activeTeamInfo.logo_url} alt="" style={{ width: '1.5rem', height: '1.5rem', objectFit: 'contain' }} />
                  )}
                  <span className="font-semibold">{activeTeamInfo ? activeTeamInfo.name : 'Team'}</span>
                </div>
                <div className="flex gap-2">
                  {POSITIONS.map(function(pos) {
                    return (
                      <button
                        key={pos}
                        className={'btn btn-sm' + (activePosition === pos ? ' btn-primary' : pickedPositions.has(pos) ? ' btn-secondary' : ' btn-ghost')}
                        onClick={function() { if (!pickedPositions.has(pos)) setActivePosition(pos) }}
                        disabled={pickedPositions.has(pos)}
                      >
                        {pickedPositions.has(pos) ? ('done ' + pos) : pos}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
            <div style={{ padding: '1rem', paddingBottom: '6rem' }}>
              {playersForPosition.length === 0 ? (
                <div className="empty-state">
                  <div className="icon">😕</div>
                  <div className="text-sm">No {activePosition} players found</div>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {playersForPosition.map(function(p) {
                    return (
                      <PlayerCard
                        key={p.id}
                        player={p}
                        selected={selectedPlayerByPos[activePosition] && selectedPlayerByPos[activePosition].api_id === p.api_id}
                        onClick={function(pl) { setSelectedPlayerByPos(function(prev) { var n = Object.assign({}, prev); n[activePosition] = pl; return n }) }}
                        disabled={pickedPlayerApiIds.has(p.api_id) && !(selectedPlayerByPos[activePosition] && selectedPlayerByPos[activePosition].api_id === p.api_id)}
                      />
                    )
                  })}
                </div>
              )}
            </div>
            {selectedPlayerByPos[activePosition] && (
              <div className="confirm-bar visible">
                <div style={{ flex: 1 }}>
                  <div className="text-sm text-muted">Selected {activePosition}</div>
                  <div className="font-semibold">{selectedPlayerByPos[activePosition].name}</div>
                </div>
                <button className="btn btn-primary" onClick={handleSavePlayer} disabled={savingPlayer}>
                  {savingPlayer ? 'Saving...' : 'Confirm'}
                </button>
              </div>
            )}
          </>
        )}
        {unread.map(function(n) { return <PokeToast key={n.id} message={n.message} onDismiss={function() { dismiss(n.id) }} /> })}
      </div>
    )
  }

  return (
    <div className="page">
      <div style={{ padding: '0.75rem 1rem', background: 'var(--navy-2)', borderBottom: '1px solid var(--line)' }}>
        <div className="flex justify-between items-center">
          <div>
            <div className="font-semibold text-sm">
              Pick {game.current_pick_number} of {game.total_picks}
            </div>
            <div className="text-xs text-muted">
              {isMyTurn ? (
                <span style={{ color: 'var(--gold)', fontWeight: 700 }}>Your turn!</span>
              ) : currentPicker ? (
                'Waiting for ' + currentPicker.name + '...'
              ) : 'Draft starting...'}
            </div>
          </div>
          <span className={'badge pot-' + currentPot}>Pot {currentPot}</span>
        </div>
        <div className="progress-bar" style={{ marginTop: '0.5rem' }}>
          <div className="progress-fill" style={{ width: (((game.current_pick_number - 1) / (game.total_picks || 1)) * 100) + '%' }} />
        </div>
      </div>

      <SnakeOrderBar players={players} currentPickerIndex={currentPickerIndex} myPlayerId={myToken} />

      <div style={{ paddingBottom: selectedTeam ? '9rem' : '5rem', overflowY: 'auto' }}>
        {isHost && (
          <details style={{ borderBottom: '1px solid var(--line)' }}>
            <summary style={{ padding: '0.75rem 1rem', cursor: 'pointer', color: 'var(--muted)', fontSize: '0.8125rem', fontWeight: 600 }}>
              Host Dashboard
            </summary>
            <HostDashboard players={players} picks={picks} currentPicker={currentPicker} onPoke={handlePoke} teams={teams} />
          </details>
        )}

        {[1, 2, 3, 4].map(function(pot) {
          return (
            <div key={pot} className="pot-section" style={{ padding: '0 1rem' }}>
              <div className="pot-header" style={{ paddingTop: '1rem' }}>
                <span className={'badge pot-' + pot}>Pot {pot}</span>
                <span className="text-xs text-muted">
                  {pot < currentPot ? 'Complete' : pot === currentPot ? 'Current' : 'Upcoming'}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(5.5rem, 1fr))', gap: '0.5rem' }}>
                {(teamsByPot[pot] || []).map(function(team) {
                  var taken = !!takenByMap[team.api_id]
                  return (
                    <TeamCard
                      key={team.api_id || team.id}
                      team={team}
                      selected={selectedTeam && selectedTeam.api_id === team.api_id}
                      taken={taken}
                      takenBy={taken ? takenByMap[team.api_id] : null}
                      onClick={isMyTurn ? function(t) { setSelectedTeam(t) } : null}
                      disabled={!isMyTurn || taken}
                    />
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      <ConfirmBar selectedTeam={selectedTeam} onConfirm={handleConfirmTeamPick} onCancel={function() { setSelectedTeam(null) }} />

      {unread.map(function(n) { return <PokeToast key={n.id} message={n.message} onDismiss={function() { dismiss(n.id) }} /> })}
    </div>
  )
}
