import React from 'react';

export default function HostDashboard({ players, picks, currentPicker, onPoke, teams, totalPicks }) {
  const progress = picks ? picks.length : 0;
  const total = totalPicks || (players ? players.length * 8 : 0);
  const pct = total > 0 ? Math.round((progress / total) * 100) : 0;

  return (
    <div className="host-dashboard">
      <div className="host-dashboard__title">🎛 Host Dashboard</div>
      <div style={{ marginBottom: '0.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--muted)', marginBottom: '0.25rem' }}>
          <span>Draft Progress</span>
          <span>{progress}/{total} picks ({pct}%)</span>
        </div>
        <div className="draft-progress">
          <div className="draft-progress__fill" style={{ width: `${pct}%` }} />
        </div>
      </div>
      {currentPicker && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginBottom: '0.15rem' }}>Currently Picking</div>
            <div style={{ fontWeight: 700, color: 'var(--gold-soft)' }}>{currentPicker.name}</div>
          </div>
          {onPoke && (
            <button
              className="btn btn-outline btn-sm"
              onClick={() => onPoke(currentPicker)}
            >
              👋 Poke
            </button>
          )}
        </div>
      )}
      {!currentPicker && (
        <div style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Draft complete or not started.</div>
      )}
    </div>
  );
}
