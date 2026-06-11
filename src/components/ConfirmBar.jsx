import React from 'react';

export default function ConfirmBar({ selectedTeam, onConfirm, onCancel, loading }) {
  const visible = !!selectedTeam;

  return (
    <div className={`confirm-bar${visible ? ' confirm-bar--visible' : ''}`}>
      <div style={{ flex: 1 }}>
        {selectedTeam && (
          <>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: 2 }}>Selected</div>
            <div style={{ fontWeight: 700, fontSize: '1rem' }}>{selectedTeam.name}</div>
          </>
        )}
      </div>
      <button className="btn btn-ghost btn-sm" onClick={onCancel} disabled={loading}>
        Cancel
      </button>
      <button className="btn btn-primary btn-sm" onClick={onConfirm} disabled={loading || !selectedTeam}>
        {loading ? 'Picking…' : 'Confirm Pick'}
      </button>
    </div>
  );
}
