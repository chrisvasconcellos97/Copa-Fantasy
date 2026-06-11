import { useState } from 'react'

export default function LeaderboardRow({ rank, player, score, picks, playerPicks, captainPickId, teams, players, isExpanded, onToggle, isHost, onOverride }) {
  const [overrideVal, setOverrideVal] = useState('')
  const [overrideReason, setOverrideReason] = useState('')
  const teamsById = Object.fromEntries((teams || []).map(t => [t.api_id, t]))
  const rankEmoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank

  return (
    <div className={'lb-row' + (isExpanded ? ' expanded' : '')}>
      <div className="lb-row-main" onClick={onToggle}>
        <span className="lb-rank">{rankEmoji}</span>
        <span className="lb-name">{player?.name || '—'}</span>
        <span className="lb-pts">{score?.total_points ?? 0} pts</span>
        <span className="lb-chevron">{isExpanded ? '▲' : '▼'}</span>
      </div>
      {isExpanded && (
        <div className="lb-detail">
          <div className="lb-score-breakdown">
            <span>Teams: {score?.team_points ?? 0}</span>
            <span>Players: {score?.player_points ?? 0}</span>
            <span>Captain: {score?.captain_bonus ?? 0}</span>
          </div>
          <div className="lb-teams">
            {(picks || []).map(pk => {
              const t = teamsById[pk.team_api_id]
              return t ? <span key={pk.id} className="lb-team-chip">{t.name}</span> : null
            })}
          </div>
          {isHost && onOverride && (
            <div className="lb-override">
              <input
                type="number"
                placeholder="±pts"
                value={overrideVal}
                onChange={e => setOverrideVal(e.target.value)}
                className="input override-input"
              />
              <input
                type="text"
                placeholder="Reason"
                value={overrideReason}
                onChange={e => setOverrideReason(e.target.value)}
                className="input override-reason"
              />
              <button
                className="btn-sm btn-gold"
                onClick={() => { onOverride(player.id, parseInt(overrideVal), overrideReason); setOverrideVal(''); setOverrideReason('') }}
              >Apply</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
