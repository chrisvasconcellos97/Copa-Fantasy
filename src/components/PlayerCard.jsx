export default function PlayerCard({ player, selected, onClick, showPosition }) {
  const posClass = { FWD: 'badge-fwd', MID: 'badge-mid', DEF: 'badge-def', GK: 'badge-gk' }[player.position] || 'badge-mid';
  return (
    <div className={`player-card${selected ? ' selected' : ''}`} onClick={onClick}>
      {player.photo_url
        ? <img src={player.photo_url} alt={player.name} />
        : <div style={{ width:56,height:56,borderRadius:'50%',background:'var(--navy-3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.5rem' }}>👤</div>
      }
      <div className="player-name">{player.name}</div>
      {showPosition && <span className={`badge ${posClass}`}>{player.position}</span>}
    </div>
  );
}
