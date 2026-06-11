export default function TeamCard({ team, selected, taken, takenBy, onClick, disabled }) {
  const cls = ['team-card', selected ? 'selected' : '', taken ? 'taken' : '', disabled ? 'disabled' : ''].filter(Boolean).join(' ');
  return (
    <div className={cls} onClick={!taken && !disabled ? onClick : undefined}>
      {team.logo_url
        ? <img src={team.logo_url} alt={team.name} />
        : <div style={{ width:48, height:48, background:'var(--navy-3)', borderRadius:6, display:'flex',alignItems:'center',justifyContent:'center', fontSize:'1.2rem' }}>⚽</div>
      }
      <div className="team-name">{team.name}</div>
      <span className={`badge badge-pot${team.pot || 1}`}>Pot {team.pot || '?'}</span>
      {taken && takenBy && <div className="taken-by">→ {takenBy}</div>}
    </div>
  );
}
