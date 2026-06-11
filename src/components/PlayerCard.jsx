import React from 'react';

const POSITION_COLORS = {
  FWD: { bg: 'rgba(217,83,79,0.2)', color: '#d9534f' },
  MID: { bg: 'rgba(200,150,58,0.2)', color: '#c8963a' },
  DEF: { bg: 'rgba(61,220,132,0.15)', color: '#3ddc84' },
  GK:  { bg: 'rgba(139,147,163,0.2)', color: '#8b93a3' },
};

export default function PlayerCard({ player, selected, onClick, showPosition = true }) {
  const posStyle = POSITION_COLORS[player.position] || POSITION_COLORS.MID;

  return (
    <div
      className={`player-card${selected ? ' player-card--selected' : ''}`}
      onClick={onClick}
    >
      {player.photo_url ? (
        <img src={player.photo_url} alt={player.name} onError={(e) => { e.target.style.display = 'none'; }} />
      ) : (
        <div style={{
          width: 40, height: 40, borderRadius: '50%', background: 'var(--navy-3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0,
        }}>
          👤
        </div>
      )}
      <div className="player-card__info">
        <div className="player-card__name truncate">{player.name}</div>
        {player.number && (
          <div className="text-xs text-muted">#{player.number}</div>
        )}
      </div>
      {showPosition && player.position && (
        <span className="badge" style={{ background: posStyle.bg, color: posStyle.color, border: `1px solid ${posStyle.color}`, flexShrink: 0 }}>
          {player.position}
        </span>
      )}
    </div>
  );
}
