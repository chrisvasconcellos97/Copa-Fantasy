export default function SquadBuilder({ picks, teams, playerPicks, players }) {
  const teamMap = Object.fromEntries((teams || []).map(t => [t.api_id, t]));
  const playerMap = Object.fromEntries((players || []).map(p => [p.api_id, p]));
  const ppByDraftPick = {};
  (playerPicks || []).forEach(pp => {
    if (!ppByDraftPick[pp.draft_pick_id]) ppByDraftPick[pp.draft_pick_id] = [];
    ppByDraftPick[pp.draft_pick_id].push(pp);
  });

  return (
    <div className="squad-builder">
      {(picks || []).map(pick => {
        const team = teamMap[pick.team_api_id];
        const slots = ppByDraftPick[pick.id] || [];
        const positions = ['FWD', 'MID', 'DEF'];
        return (
          <div key={pick.id} className="squad-team-block">
            <div className="squad-team-header">
              {team?.logo_url && <img src={team.logo_url} alt={team.name} />}
              <span>{team?.name || pick.team_api_id}</span>
              <span className={`badge badge-pot${pick.pot || 1}`}>Pot {pick.pot}</span>
            </div>
            <div className="squad-slots">
              {positions.map(pos => {
                const pp = slots.find(s => s.position === pos);
                const pl = pp ? playerMap[pp.player_api_id] : null;
                return (
                  <div key={pos} className={`squad-slot${pp ? ' filled' : ''}`}>
                    <div className="slot-pos">{pos}</div>
                    {pl
                      ? <div className="slot-name">{pl.name.split(' ').slice(-1)[0]}</div>
                      : <div style={{ color:'var(--muted)', fontSize:'0.65rem' }}>Empty</div>
                    }
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
