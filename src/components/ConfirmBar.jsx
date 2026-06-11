export default function ConfirmBar({ selectedTeam, onConfirm, onCancel }) {
  if (!selectedTeam) return null;

  return (
    <div className="confirm-bar">
      <div className="confirm-bar__team">
        {selectedTeam.logo_url ? (
          <img className="confirm-bar__logo" src={selectedTeam.logo_url} alt={selectedTeam.name} />
        ) : (
          <span style={{ fontSize: '1.6rem' }}>🏴</span>
        )}
        <span className="confirm-bar__name">{selectedTeam.name}</span>
      </div>
      <button className="btn btn-primary" onClick={onConfirm}>
        ✓ Confirm Pick
      </button>
      <button className="btn btn-secondary" onClick={onCancel}>
        Cancel
      </button>
    </div>
  );
}
