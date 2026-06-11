export default function ConfirmBar({ selectedTeam, onConfirm, onCancel }) {
  if (!selectedTeam) return null
  return (
    <div className="confirm-bar">
      <span className="confirm-team-name">{selectedTeam.name}</span>
      <div className="confirm-actions">
        <button className="btn-secondary" onClick={onCancel}>Cancel</button>
        <button className="btn-primary" onClick={onConfirm}>Confirm Pick</button>
      </div>
    </div>
  )
}
