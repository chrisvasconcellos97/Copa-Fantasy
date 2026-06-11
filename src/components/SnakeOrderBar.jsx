export default function SnakeOrderBar({ players, currentPickerIndex, myPlayerId }) {
  return (
    <div className="snake-order-bar">
      {(players || []).map((p, i) => (
        <div
          key={p.id}
          className={'snake-player' + (i === currentPickerIndex ? ' active' : '') + (p.id === myPlayerId ? ' me' : '')}
        >
          <span className="snake-name">{p.name}</span>
          {i === currentPickerIndex && <span className="snake-indicator">●</span>}
        </div>
      ))}
    </div>
  )
}
