import React from 'react';
import { TEAM_POINTS, PLAYER_POINTS } from '../lib/scoring';

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
      {positive ? '+' : ''}{value}
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
          <Row label="Win in group stage" value={TEAM_POINTS.group_win} />
          <Row label="Draw in group stage" value={TEAM_POINTS.group_draw} />
          <Row label="Loss in group stage" value={TEAM_POINTS.group_loss} positive={false} />
          <Row label="Win in Round of 32" value={TEAM_POINTS.r32_win} />
          <Row label="Win in Quarter-final" value={TEAM_POINTS.qf_win} />
          <Row label="Win in Semi-final" value={TEAM_POINTS.sf_win} />
          <Row label="Win the Final" value={TEAM_POINTS.final_win} />
          <Row label="Tournament champion" value={TEAM_POINTS.champion} />
        </div>

        {/* Player points */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
            Your Players
          </div>
          <Row label="Goal scored" value={PLAYER_POINTS.goal} />
          <Row label="Assist" value={PLAYER_POINTS.assist} />
          <Row label="Clean sheet (GK)" value={PLAYER_POINTS.clean_sheet_gk} />
          <Row label="Clean sheet (Defender)" value={PLAYER_POINTS.clean_sheet_def} />
          <Row label="Man of the Match" value={PLAYER_POINTS.motm} />
          <Row label="Tournament top scorer" value={PLAYER_POINTS.top_scorer} />
          <Row label="Golden Boot winner" value={PLAYER_POINTS.golden_boot} />
          <Row label="Yellow card" value={PLAYER_POINTS.yellow_card} positive={false} />
          <Row label="Red card" value={PLAYER_POINTS.red_card} positive={false} />
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
          👑 <strong style={{ color: 'var(--gold)' }}>Captain bonus:</strong> Your chosen captain earns <strong>double points</strong> on every stat listed above.
        </div>
      </div>
    </div>
  );
}
