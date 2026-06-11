export default function ConfirmBar({ selectedTeam, onConfirm, onCancel }) {
  const visible = !!selectedTeam;
  const fallback = selectedTeam
    ? `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedTeam.name || 'T')}&background=2a2a3a&color=e8e8f0&size=36`
    : '';

  return (
    <div className={`confirm-bar ${visible ? 'visible' : ''}`}>
      <div className="confirm-bar-info">
        {selectedTeam && (
          <>
            <img
              src={selectedTeam.logo_url || fallback}
              alt={selectedTeam.name}
              className="confirm-bar-logo"
              onError={(e) => { e.target.src = fallback; }}
            />
            <span className="confirm-bar-name">{selectedTeam.name}</span>
          </>
        )}
      </div>
      <button className="btn btn-outline btn-sm" onClick={onCancel}>
        Cancel
      </button>
      <button className="btn btn-gold btn-sm" onClick={onConfirm} disabled={!selectedTeam}>
        Confirm Pick
      </button>
    </div>
  );
}
