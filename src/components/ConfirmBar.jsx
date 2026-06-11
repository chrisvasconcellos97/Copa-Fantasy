import React from 'react';

export default function ConfirmBar({ selectedTeam, onConfirm, onCancel }) {
  const visible = !!selectedTeam;

  return (
    <div className={`confirm-bar${visible ? ' visible' : ''}`}>
      {selectedTeam?.logo_url && (
        <img src={selectedTeam.logo_url} alt={selectedTeam.name} />
      )}
      <span className="team-label">{selectedTeam?.name || ''}</span>
      <button className="btn btn-secondary btn-sm" onClick={onCancel}>
        Cancel
      </button>
      <button className="btn btn-primary" onClick={onConfirm}>
        Confirm Pick
      </button>
    </div>
  );
}
