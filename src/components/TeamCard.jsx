import React from 'react';

export default function TeamCard({ team, selected, taken, takenBy, onClick, disabled }) {
  const handleClick = () => {
    if (disabled || taken) return;
    if (onClick) onClick(team);
  };

  return (
    <div
      className={[
        'team-card',
        selected ? 'team-card--selected' : '',
        taken ? 'team-card--taken' : '',
        disabled && !taken ? 'team-card--disabled' : '',
      ].filter(Boolean).join(' ')}
      onClick={handleClick}
      style={{
        position: 'relative',
        background: 'var(--card-bg)',
        border: `2px solid ${selected ? 'var(--gold)' : taken ? 'var(--border)' : 'var(--border)'}`,
        borderRadius: 'var(--radius)',
        padding: '12px 8px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
        cursor: disabled || taken ? 'default' : 'pointer',
        transition: 'all 0.2s ease',
        boxShadow: selected ? '0 0 20px rgba(255,215,0,0.4)' : 'none',
        opacity: disabled && !selected ? 0.7 : 1,
        userSelect: 'none',
      }}
    >
      {/* Pot badge */}
      {team.pot && (
        <span
          style={{
            position: 'absolute',
            top: 6,
            right: 6,
            fontSize: '0.65rem',
            background: 'rgba(255,215,0,0.15)',
            color: 'var(--gold)',
            borderRadius: 4,
            padding: '1px 5px',
            fontWeight: 600,
          }}
        >
          P{team.pot}
        </span>
      )}

      {/* Logo */}
      <div style={{ width: 52, height: 52, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {team.logo_url ? (
          <img
            src={team.logo_url}
            alt={team.name}
            style={{
              width: 48,
              height: 48,
              objectFit: 'contain',
              filter: taken ? 'grayscale(100%) brightness(0.4)' : 'none',
            }}
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        ) : (
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: 'var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.2rem',
              filter: taken ? 'grayscale(100%) brightness(0.4)' : 'none',
            }}
          >
            ⚽
          </div>
        )}
      </div>

      {/* Name */}
      <span
        style={{
          fontSize: '0.78rem',
          fontWeight: 600,
          textAlign: 'center',
          color: taken ? 'var(--text-muted)' : selected ? 'var(--gold)' : 'var(--text)',
          lineHeight: 1.2,
          maxWidth: '100%',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {team.name}
      </span>

      {/* Taken overlay */}
      {taken && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 'var(--radius)',
            background: 'rgba(10,10,15,0.6)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
          }}
        >
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center', padding: '0 4px' }}>
            {takenBy || 'Taken'}
          </span>
        </div>
      )}

      {/* Selected indicator */}
      {selected && (
        <div
          style={{
            position: 'absolute',
            bottom: 6,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: 'var(--gold)',
          }}
        />
      )}
    </div>
  );
}
