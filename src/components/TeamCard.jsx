import React from 'react';

export default function TeamCard({ team, selected, taken, takenBy, onClick, disabled }) {
  const handleClick = () => {
    if (disabled || taken) return;
    onClick && onClick(team);
  };

  return (
    <div
      onClick={handleClick}
      style={{
        background: taken ? '#0d0d14' : 'var(--card-bg)',
        border: `1px solid ${selected ? 'var(--gold)' : taken ? 'var(--border)' : 'var(--border)'}`,
        borderRadius: 'var(--radius)',
        padding: '12px',
        cursor: disabled || taken ? 'default' : 'pointer',
        opacity: taken ? 0.5 : 1,
        boxShadow: selected ? 'var(--shadow-gold)' : 'none',
        animation: selected ? 'goldPulse 1.6s infinite' : 'none',
        transition: 'border-color 0.18s, box-shadow 0.18s, opacity 0.18s',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
        textAlign: 'center',
        minHeight: '110px',
        justifyContent: 'center',
        filter: taken ? 'grayscale(0.7)' : 'none',
      }}
    >
      {team.logo_url ? (
        <img
          src={team.logo_url}
          alt={team.name}
          style={{ width: 44, height: 44, objectFit: 'contain' }}
          onError={e => { e.target.style.display = 'none'; }}
        />
      ) : (
        <div style={{ width: 44, height: 44, background: 'var(--border)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
          ⚽
        </div>
      )}
      <span style={{ fontSize: 12, fontWeight: 600, color: taken ? 'var(--text-muted)' : 'var(--text)', lineHeight: 1.3 }}>
        {team.name}
      </span>
      {team.pot && (
        <span style={{ fontSize: 10, color: 'var(--text-muted)', background: 'var(--border)', padding: '1px 6px', borderRadius: 999 }}>
          Pot {team.pot}
        </span>
      )}
      {taken && takenBy && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.55)',
          borderRadius: 'var(--radius)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 11,
          color: 'var(--text-muted)',
          fontWeight: 600,
          padding: 6,
          textAlign: 'center',
        }}>
          {takenBy}
        </div>
      )}
      {selected && (
        <div style={{ position: 'absolute', top: 6, right: 6 }}>
          <span style={{ color: 'var(--gold)', fontSize: 14 }}>✓</span>
        </div>
      )}
    </div>
  );
}
