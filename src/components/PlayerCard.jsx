import { normalizePosition } from '../lib/constants';

const POS_COLORS = {
  GK: '#f59e0b',
  DEF: '#3b82f6',
  MID: '#22c55e',
  FWD: '#ef4444',
};

export default function PlayerCard({ player, selected, onClick, showPosition = true }) {
  const pos = normalizePosition(player.position);
  const posColor = POS_COLORS[pos] || '#8888aa';

  return (
    <div
      className={`player-card${selected ? ' player-card--selected' : ''}`}
      onClick={() => onClick && onClick(player)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick && onClick(player)}
    >
      {player.photo_url ? (
        <img className="player-card__photo" src={player.photo_url} alt={player.name} loading="lazy" />
      ) : (
        <div className="player-card__photo-fallback">👤</div>
      )}
      <span className="player-card__name">{player.name}</span>
      {showPosition && (
        <span className="player-card__pos" style={{ background: posColor + '22', color: posColor }}>
          {pos}
        </span>
      )}
      {player.number != null && (
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>#{player.number}</span>
      )}
    </div>
  );
}
