export default function SnakeOrderBar({ players = [], currentPickerIndex, myPlayerId }) {
  return (
    <div className="snake-bar">
      <span className="text-xs text-muted" style={{ flexShrink: 0 }}>Draft Order:</span>
      {players.map((player, i) => {
        const isCurrent = i === currentPickerIndex;
        const isMine = player.id === myPlayerId;
        const classes = [
          'snake-chip',
          isCurrent ? 'current' : '',
          !isCurrent && isMine ? 'mine' : '',
        ].filter(Boolean).join(' ');
        return (
          <div key={player.id} className={classes}>
            {player.player_name}
            {isMine && !isCurrent && ' (you)'}
          </div>
        );
      })}
    </div>
  );
}
