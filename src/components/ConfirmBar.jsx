import React from 'react';

export default function ConfirmBar({ selectedTeam, onConfirm, onCancel }) {
  const visible = !!selectedTeam;

  return (
    <div className={`confirm-bar${visible ? ' visible' : ''}`}>
      {selectedTeam && (
        <>
          {selectedTeam.logo_url ? (
            <img src={selectedTeam.logo_url} alt={selectedTeam.name}
              style={{ width: 36, height: 36, objectFit: 'contain' }} />
          ) : (
            <span style={{ fontSize: '1.5rem' }}>⚽</span>
          )}
          <span className="font-bold text-lg" style={{ flex: 1 }}>{selectedTeam.name}</span>
          <button className="btn btn-secondary btn-sm" onClick={onCancel}>Cancel</button>
          <button className="btn btn-primary" onClick={onConfirm}>Confirm Pick</button>
        </>
      )}
    </div>
  );
}
