export default function TeamCard({ team, selected, taken, takenBy, onClick, disabled }) {
  const classes = [
    'team-card',
    selected ? 'team-card--selected' : '',
    taken ? 'team-card--taken' : '',
    disabled && !taken ? 'team-card--disabled' : '',
  ]
    .filter(Boolean)
    .join(' ');

  function handleClick() {
    if (taken || disabled) return;
    onClick && onClick(team);
  }

  return (
    <div className={classes} onClick={handleClick} role="button" tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}>
      {team.logo_url ? (
        <img className="team-card__logo" src={team.logo_url} alt={team.name} loading="lazy" />
      ) : (
        <div className="team-card__logo-fallback">🏴</div>
      )}
      <span className="team-card__name">{team.name}</span>
      {taken && (
        <div className="team-card__taken-overlay">
          {takenBy || 'Taken'}
        </div>
      )}
    </div>
  );
}
