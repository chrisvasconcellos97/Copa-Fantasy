import PlayerCard from './PlayerCard';

export default function CaptainGrid({ playerPicks = [], captainPickId, onSelectCaptain }) {
  return (
    <div>
      <div className="text-sm text-muted mb-3">
        Select your captain — their points score double.
      </div>
      {playerPicks.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">👤</div>
          <div className="empty-state-title">No players selected yet</div>
        </div>
      ) : (
        <div className="captain-grid">
          {playerPicks.map((player) => {
            const isSelected = String(player.api_id) === String(captainPickId);
            return (
              <div key={player.api_id} style={{ position: 'relative' }}>
                {isSelected && <div className="captain-crown">👑</div>}
                <PlayerCard
                  player={player}
                  selected={isSelected}
                  onClick={() => onSelectCaptain && onSelectCaptain(player)}
                  showPosition
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
