import { normalizePosition } from '../lib/constants';

export default function PlayerCard({ player, selected, onClick, showPosition = true, disabled = false }) {
  const pos = normalizePosition(player?.position);
  const fallbackPhoto = `https://ui-avatars.com/api/?name=${encodeURIComponent(player?.name || 'P')}&background=2a2a3a&color=e8e8f0&size=52&rounded=true`;

  const classes = [
    'player-card',
    selected ? 'selected' : '',
    disabled ? 'disabled' : '',
  ].filter(Boolean).join(' ');

  return (
    <div
      className={classes}
      onClick={() => !disabled && onClick && onClick(player)}
      title={player?.name}
    >
      <img
        src={player?.photo_url || fallbackPhoto}
        alt={player?.name}
        className="player-card-photo"
        onError={(e) => { e.target.src = fallbackPhoto; }}
      />
      <div className="player-card-name">{player?.name}</div>
      {player?.number && (
        <div className="player-card-number">#{player.number}</div>
      )}
      {showPosition && pos !== 'default' && (
        <span className={`position-badge pos-${pos}`}>{pos}</span>
      )}
    </div>
  );
}
