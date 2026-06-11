import React, { useState } from 'react'
import { getTeamByCode } from '../lib/constants.js'

export default function HeroModal({ team: teamProp, teamCode, onConfirm }) {
  const [heroName, setHeroName] = useState('')
  const team = teamProp || getTeamByCode(teamCode)

  return (
    <div className="modal-overlay">
      <div className="modal-box" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '3.5rem', marginBottom: '0.75rem' }}>{team?.flag}</div>
        <h2 className="text-accent" style={{ marginBottom: '0.5rem' }}>Name Your Hero</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          Pick a standout player from <strong style={{ color: 'var(--text-primary)' }}>{team?.name}</strong><br />
          They'll earn you bonus points throughout the tournament
        </p>
        <div className="form-group" style={{ marginBottom: '1rem' }}>
          <input
            className="input"
            placeholder="e.g. Lionel Messi"
            value={heroName}
            onChange={e => setHeroName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && heroName.trim() && onConfirm(heroName.trim())}
            autoFocus
            style={{ textAlign: 'center', fontSize: '1rem' }}
          />
        </div>
        <button
          className="btn btn-primary w-full btn-lg"
          onClick={() => heroName.trim() && onConfirm(heroName.trim())}
          disabled={!heroName.trim()}
        >
          ⭐ Confirm Hero
        </button>
      </div>
    </div>
  )
}
