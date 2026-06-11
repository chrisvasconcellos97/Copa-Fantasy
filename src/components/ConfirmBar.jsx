import React from 'react';

export default function ConfirmBar({ selectedTeam, onConfirm, onCancel, confirmLabel = 'Confirm Pick' }) {
  const visible = !!selectedTeam;

  return (
    <div className={`confirm-bar ${visible ? 'confirm-bar--visible' : ''}`}>
      <div style={{ flex: 1, minWidth: 0 }}>
        {selectedTeam && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            {selectedTeam.logo_url && (
              <img src={selectedTeam.logo_url} alt="" style={{ width: 32, height: 32, objectFit: 'contain' }} />
            )}
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{selectedTeam.name}</div>
              {selectedTeam.pot && (
                <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>Pot {selectedTeam.pot}</div>
              )}
            </div>
          </div>
        )}
      </div>
      <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
      <button className="btn btn-gold btn-sm" onClick={onConfirm}>{confirmLabel}</button>
    </div>
  );
}
