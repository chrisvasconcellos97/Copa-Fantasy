import React from 'react';
import { TEAM_SCORING_ROWS, PLAYER_SCORING_ROWS, CAPTAIN_MULTIPLIER } from '../lib/scoring';

const Row = ({ label, value, positive = true }) => (
  <div style={{
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '7px 0',
    borderBottom: '1px solid var(--border)',
  }}>
    <span style={{ fontSize: '0.88rem', color: 'var(--text)' }}>{label}</span>
    <span style={{
      fontWeight: 700,
      fontSize: '0.88rem',
      color: positive ? 'var(--success)' : 'var(--danger)',
      minWidth: 36,
      textAlign: 'right',
    }}>
      {positive && value > 0 ? '+' : ''}{value}
    </span>
  </div>
);

export default function PointsModal({ onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.65)',
        zIndex: 200,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        padding: '0 0 0 0',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--dark-bg)',
          border: '1px solid var(--border)',
          borderRadius: '16px 16px 0 0',
          width: '100%',
          maxWidth: 480,
          maxHeight: '80vh',
          overflowY: 'auto',
          padding: '20px 20px 40px',
        }}
      >
        {/* Handle */}
        <div style={{ width: 36, height: 4, background: 'var(--border)', borderRadius: 2, margin: '0 auto 20px' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--gold)' }}>⚽ How Points Work</h2>
          <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
        </div>

        {/* Team points */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
            Your Teams
          </div>
          {TEAM_SCORING_ROWS.map(r => (
            <Row key={r.label} label={r.label} value={r.value} positive={r.positive !== false} />
          ))}
        </div>

        {/* Player points */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
            Your Players
          </div>
          {PLAYER_SCORING_ROWS.map(r => (
            <Row key={r.label} label={r.label} value={r.value} positive={r.positive !== false} />
          ))}
        </div>

        {/* Captain note */}
        <div style={{
          background: 'rgba(255,215,0,0.08)',
          border: '1px solid rgba(255,215,0,0.3)',
          borderRadius: 'var(--radius)',
          padding: '10px 14px',
          fontSize: '0.85rem',
          color: 'var(--text)',
          lineHeight: 1.5,
        }}>
          👑 <strong style={{ color: 'var(--gold)' }}>Captain bonus:</strong> Your chosen captain earns <strong>{CAPTAIN_MULTIPLIER}×</strong> on every player stat above — goals, assists, clean sheets, match bonuses and the Golden Boot all count double.
        </div>
      </div>
    </div>
  );
}
