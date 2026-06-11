export default function SnakeOrderBar({ players, currentPickerIndex, myPlayerId }) {
  return (
    <div className="snake-order-bar">
      {players.map((player, i) => {
        const isCurrent = i === currentPickerIndex;
        const isMe = player.id === myPlayerId;
        const cls = ['snake-chip', isCurrent ? 'current' : '', isMe ? 'mine' : ''].filter(Boolean).join(' ');
        return (
          <div key={player.id} className={cls}>
            {isCurrent && <span className="snake-arrow">▶ </span>}
            {player.player_name}
          </div>
        );
      })}
    </div>
  );
}
