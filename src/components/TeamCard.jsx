export default function TeamCard({ team, selected, taken, takenBy, onClick, disabled }) {
  const cls = [
    'team-card',
    selected ? 'selected' : '',
    taken ? 'taken' : '',
    disabled ? 'disabled' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={cls} onClick={!disabled && !taken ? onClick : undefined} role="button" tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && !disabled && !taken && onClick && onClick()}>
      <div className="team-card-logo">
        {team.logo_url ? (
          <img src={team.logo_url} alt={team.name} width={48} height={48} />
        ) : (
          <div className="team-logo-fallback">{team.name?.slice(0,2).toUpperCase()}</div>
        )}
      </div>
      <div className="team-card-name">{team.name}</div>
      <div className="team-card-pot text-muted text-sm">Pot {team.pot}</div>
      {taken && (
        <div className="team-taken-overlay">
          <span className="text-sm">{takenBy}</span>
        </div>
      )}
    </div>
  );
}
