import { normalizePosition } from '../lib/constants.js';

export default function PlayerCard({ player, selected, onClick, showPosition = true }) {
  const pos = normalizePosition(player?.position);
  const posColors = { GK: '#f6c90e', DEF: '#3182ce', MID: '#38a169', FWD: '#e53e3e' };
  const initials = player?.name ? player.name.split(' ').map(n=>n[0]).slice(0,2).join('') : '??';

  return (
    <div className={`player-card ${selected ? 'selected' : ''}`} onClick={onClick} role="button" tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick && onClick()}>
      <div className={`player-photo-wrap ${selected ? 'selected' : ''}`}>
        {player?.photo_url ? (
          <img src={player.photo_url} alt={player.name} className="player-photo" />
        ) : (
          <div className="player-initials">{initials}</div>
        )}
      </div>
      <div className="player-info">
        <div className="player-name text-sm font-bold">{player?.name}</div>
        {player?.number && <div className="player-number text-muted text-sm">#{player.number}</div>}
        {showPosition && pos && (
          <span className="position-badge" style={{ background: posColors[pos] || '#555' }}>{pos}</span>
        )}
      </div>
    </div>
  );
}
