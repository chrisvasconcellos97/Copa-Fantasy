export default function SnakeOrderBar({ players, currentPickerIndex, myPlayerId }) {
  return (
    <div className="snake-bar">
      {players.map((p, i) => {
        const isActive = i === currentPickerIndex;
        const isMe = p.session_token === myPlayerId || p.id === myPlayerId;
        return (
          <div key={p.id} className={`snake-bar-item${isActive ? ' active' : isMe ? ' me' : ''}`}>
            {p.name}
            {isActive && ' ⚡'}
          </div>
        );
      })}
    </div>
  );
}
