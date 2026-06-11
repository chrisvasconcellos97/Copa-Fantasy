import React from 'react';

export default function ConfirmBar({ selectedTeam, onConfirm, onCancel }) {
  const visible = !!selectedTeam;

  return (
    <div className={`confirm-bar${visible ? ' visible' : ''}`}>
      {selectedTeam && (
        <>
          {selectedTeam.logo_url ? (
            <img
              src={selectedTeam.logo_url}
              alt={selectedTeam.name}
              style={{ width: 40, height: 40, objectFit: 'contain', flexShrink: 0 }}
            />
          ) : (
            <span style={{ fontSize: '1.6rem', flexShrink: 0 }}>⚽</span>
          )}
          <span style={{ flex: 1, fontWeight: 700, fontSize: '1rem' }}>{selectedTeam.name}</span>
          <button className="btn btn-outline btn-sm" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn btn-gold btn-sm" onClick={onConfirm}>
            Confirm Pick
          </button>
        </>
      )}
    </div>
  );
}
