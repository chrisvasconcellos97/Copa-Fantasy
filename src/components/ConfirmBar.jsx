export default function ConfirmBar({ selectedTeam, onConfirm, onCancel }) {
  return (
    <div className={`confirm-bar${selectedTeam ? ' visible' : ''}`}>
      <div className="confirm-bar-info">
        {selectedTeam && (
          <>
            <div className="pick-label">Your pick</div>
            <div className="team-name">{selectedTeam.name}</div>
          </>
        )}
      </div>
      <button className="btn btn-secondary btn-sm" onClick={onCancel}>Cancel</button>
      <button className="btn btn-primary btn-sm" onClick={onConfirm} disabled={!selectedTeam}>Confirm</button>
    </div>
  );
}
