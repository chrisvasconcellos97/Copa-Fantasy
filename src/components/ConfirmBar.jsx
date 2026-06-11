export default function ConfirmBar({ selectedTeam, onConfirm, onCancel }) {
  return (
    <div className={`confirm-bar ${selectedTeam ? 'visible' : ''}`}>
      {selectedTeam && (
        <div className="confirm-bar-inner">
          <div className="flex gap-2" style={{alignItems:'center'}}>
            {selectedTeam.logo_url && (
              <img src={selectedTeam.logo_url} alt={selectedTeam.name} width={36} height={36} />
            )}
            <span className="font-bold">{selectedTeam.name}</span>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
            <button className="btn btn-primary" onClick={onConfirm}>Confirm Pick</button>
          </div>
        </div>
      )}
    </div>
  );
}
