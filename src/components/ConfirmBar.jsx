import React from 'react';

export default function ConfirmBar({ selectedTeam, onConfirm, onCancel }) {
  if (!selectedTeam) return null;

  return (
    <div className="confirm-bar">
      <div className="confirm-bar__info">
        {selectedTeam.logo_url ? (
          <img
            className="confirm-bar__logo"
            src={selectedTeam.logo_url}
            alt={selectedTeam.name}
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        ) : (
          <span style={{ fontSize: '1.5rem' }}>🏳️</span>
        )}
        <span className="confirm-bar__name">{selectedTeam.name}</span>
      </div>
      <div className="confirm-bar__actions">
        <button className="btn btn-secondary btn-sm" onClick={onCancel}>
          Cancel
        </button>
        <button className="btn btn-primary btn-sm" onClick={onConfirm}>
          Confirm Pick
        </button>
      </div>
    </div>
  );
}
