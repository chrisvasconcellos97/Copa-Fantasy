export default function TeamCard({ team, selected, taken, takenBy, onClick, disabled }) {
  const classes = [
    'team-card',
    selected ? 'selected' : '',
    taken ? 'taken' : '',
    disabled && !selected ? 'disabled' : '',
  ].filter(Boolean).join(' ');

  function handleClick() {
    if (disabled || taken) return;
    onClick && onClick(team);
  }

  const fallbackLogo = `https://ui-avatars.com/api/?name=${encodeURIComponent(team?.name || 'T')}&background=2a2a3a&color=e8e8f0&size=56`;

  return (
    <div className={classes} onClick={handleClick} title={taken ? `Picked by ${takenBy}` : team?.name}>
      <img
        src={team?.logo_url || fallbackLogo}
        alt={team?.name}
        className="team-card-logo"
        onError={(e) => { e.target.src = fallbackLogo; }}
      />
      <div className="team-card-name">{team?.name}</div>
      {team?.pot && (
        <div className="team-card-pot">Pot {team.pot}</div>
      )}
      {taken && takenBy && (
        <div className="team-card-taken-overlay">{takenBy}</div>
      )}
    </div>
  );
}
