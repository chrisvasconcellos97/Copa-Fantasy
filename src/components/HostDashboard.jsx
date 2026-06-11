import React, { useState } from 'react';

export default function HostDashboard({ players, picks, currentPicker, onPoke, teams }) {
  const [poking, setPoking] = useState(false);

  const totalPicks = players ? players.length * 8 : 0;
  const progress = totalPicks > 0 ? Math.round((picks.length / totalPicks) * 100) : 0;

  async function handlePoke() {
    setPoking(true);
    try {
      await onPoke(currentPicker?.id);
    } finally {
      setPoking(false);
    }
  }

  // Build pick count per player
  const pickCounts = {};
  if (picks) {
    picks.forEach((p) => {
      pickCounts[p.player_id] = (pickCounts[p.player_id] || 0) + 1;
    });
  }

  return (
    <div className="host-dashboard">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-xs text-muted" style={{ marginBottom: 2 }}>Host Dashboard</div>
          <div className="font-bold">Draft Progress</div>
        </div>
        <span className="badge badge-gold">{picks.length} / {totalPicks} picks</span>
      </div>

      {/* Progress bar */}
      <div style={{ background: 'var(--navy)', borderRadius: 4, height: 6, marginBottom: 16 }}>
        <div style={{ background: 'var(--gold)', borderRadius: 4, height: 6, width: `${progress}%`, transition: 'width .5s' }} />
      </div>

      {/* Current picker */}
      {currentPicker && (
        <div className="flex items-center gap-3" style={{ background: 'var(--navy)', borderRadius: 8, padding: '10px 14px', marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            <div className="text-xs text-muted">Currently picking</div>
            <div className="font-bold" style={{ color: 'var(--gold)' }}>{currentPicker.name}</div>
          </div>
          <button
            className="btn btn-sm btn-secondary"
            onClick={handlePoke}
            disabled={poking}
          >
            {poking ? '…' : '👋 Poke'}
          </button>
        </div>
      )}

      {/* Per-player pick counts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 6 }}>
        {players && players.map((p) => (
          <div key={p.id} style={{
            background: 'var(--navy)', borderRadius: 6, padding: '6px 10px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            fontSize: '0.78rem', border: currentPicker?.id === p.id ? '1px solid var(--gold)' : '1px solid var(--line)',
          }}>
            <span className="truncate" style={{ maxWidth: 80 }}>{p.name}</span>
            <span style={{ color: 'var(--gold)', fontWeight: 700 }}>{pickCounts[p.id] || 0}/8</span>
          </div>
        ))}
      </div>
    </div>
  );
}
