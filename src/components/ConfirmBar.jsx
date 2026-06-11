import React from 'react';

/**
 * ConfirmBar – fixed bottom bar that slides up when a team is selected.
 *
 * Props:
 *   selectedTeam  object|null
 *   onConfirm     function
 *   onCancel      function
 */
export default function ConfirmBar({ selectedTeam, onConfirm, onCancel }) {
  if (!selectedTeam) return null;

  return (
    <div className="confirm-bar animate-slide-up">
      <div className="confirm-bar__inner">
        <div className="confirm-bar__team">
          {selectedTeam.logo_url && (
            <img src={selectedTeam.logo_url} alt="" className="confirm-bar__logo" />
          )}
          <div>
            <p className="confirm-bar__label">Selected</p>
            <p className="confirm-bar__name">{selectedTeam.name}</p>
          </div>
        </div>

        <div className="confirm-bar__actions">
          <button className="btn btn-secondary btn-sm" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={onConfirm}>
            Confirm Pick
          </button>
        </div>
      </div>

      <style>{`
        .confirm-bar {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 150;
          background: var(--card-bg);
          border-top: 2px solid var(--gold);
          box-shadow: 0 -8px 32px rgba(0,0,0,0.6);
          padding: 0.75rem 1rem;
        }
        .confirm-bar__inner {
          max-width: 900px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
        }
        .confirm-bar__team {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .confirm-bar__logo {
          width: 44px;
          height: 44px;
          object-fit: contain;
        }
        .confirm-bar__label {
          font-size: 0.7rem;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.04em;
          margin-bottom: 0.1rem;
        }
        .confirm-bar__name {
          font-weight: 700;
          font-size: 1rem;
          color: var(--text);
        }
        .confirm-bar__actions {
          display: flex;
          gap: 0.5rem;
          align-items: center;
        }
      `}</style>
    </div>
  );
}
