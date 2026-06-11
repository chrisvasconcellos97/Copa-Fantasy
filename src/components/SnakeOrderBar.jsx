export default function SnakeOrderBar({ players, currentPickerIndex, myPlayerId }) {
  if (!players || players.length === 0) return null;

  return (
    <div className="snake-bar">
      <span className="label" style={{ whiteSpace: 'nowrap', marginRight: '0.25rem' }}>Draft order:</span>
      {players.map((player, i) => {
        const isCurrent = i === currentPickerIndex;
        const isMe = player.id === myPlayerId;
        return (
          <span
            key={player.id}
            className={[
              'snake-chip',
              isCurrent ? 'snake-chip--current' : '',
              isMe && !isCurrent ? 'snake-chip--me' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {isCurrent && <span>⏳</span>}
            {player.player_name}
            {isMe && <span style={{ fontSize: '0.7em' }}> (you)</span>}
          </span>
        );
      })}
    </div>
  );
}
