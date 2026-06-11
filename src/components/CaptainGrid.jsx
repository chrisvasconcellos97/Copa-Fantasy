import { normalizePosition } from '../lib/constants';

export default function CaptainGrid({ playerPicks, captainPickId, onSelectCaptain }) {
  if (!playerPicks || playerPicks.length === 0) {
    return (
      <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
        No players selected yet.
      </div>
    );
  }

  return (
    <div className="captain-grid">
      {playerPicks.map((player) => {
        const isCaptain = player.api_id === captainPickId;
        return (
          <div
            key={player.api_id}
            className={`captain-card${isCaptain ? ' captain-card--selected' : ''}`}
            onClick={() => onSelectCaptain && onSelectCaptain(player)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onSelectCaptain && onSelectCaptain(player)}
          >
            {isCaptain && <span className="captain-card__crown">👑</span>}
            {player.photo_url ? (
              <img
                style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', border: isCaptain ? '2px solid var(--gold)' : '2px solid var(--border)' }}
                src={player.photo_url}
                alt={player.name}
                loading="lazy"
              />
            ) : (
              <div
                style={{
                  width: 48, height: 48, borderRadius: '50%', background: 'var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem',
                  border: isCaptain ? '2px solid var(--gold)' : '2px solid var(--border)',
                }}
              >
                👤
              </div>
            )}
            <span style={{ fontSize: '0.75rem', fontWeight: 600, lineHeight: 1.2 }}>{player.name}</span>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {normalizePosition(player.position)}
            </span>
            {isCaptain && (
              <span className="badge badge-gold" style={{ fontSize: '0.65rem' }}>Captain</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
