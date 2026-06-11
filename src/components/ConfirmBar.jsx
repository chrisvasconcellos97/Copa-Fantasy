import React from 'react';

export default function ConfirmBar({ selectedTeam, onConfirm, onCancel }) {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 150,
        background: 'var(--card-bg)',
        borderTop: '1px solid var(--border)',
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        transform: selectedTeam ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 0.25s ease',
        boxShadow: '0 -4px 24px rgba(0,0,0,0.4)',
      }}
    >
      {selectedTeam && (
        <>
          {/* Team info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
            {selectedTeam.logo_url && (
              <img
                src={selectedTeam.logo_url}
                alt={selectedTeam.name}
                style={{ width: 36, height: 36, objectFit: 'contain', flexShrink: 0 }}
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            )}
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>Selected</div>
              <div
                style={{
                  fontSize: '1rem',
                  fontWeight: 700,
                  color: 'var(--gold)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {selectedTeam.name}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button className="btn btn-secondary btn-sm" onClick={onCancel}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={onConfirm}>
              Confirm Pick ✓
            </button>
          </div>
        </>
      )}
    </div>
  );
}
