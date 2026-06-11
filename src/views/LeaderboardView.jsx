import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useScores } from '../hooks/useScores';
import { usePlayers } from '../hooks/usePlayers';
import { supabase } from '../lib/supabase';
import LeaderboardRow from '../components/LeaderboardRow';
import { RESULT_TYPES } from '../lib/constants';

function getSession() {
  try {
    return JSON.parse(localStorage.getItem('copa_session') || '{}');
  } catch {
    return {};
  }
}

export default function LeaderboardView() {
  const { gameId } = useParams();
  const { scores, loading: scoresLoading } = useScores(gameId);
  const { players } = usePlayers(gameId);
  const session = getSession();
  const isHost = !!session.hostToken;

  const [expandedId, setExpandedId] = useState(null);
  const [teams, setTeams] = useState([]);
  const [allPlayers, setAllPlayers] = useState([]);
  const [picks, setPicks] = useState([]);
  const [playerPicks, setPlayerPicks] = useState([]);
  const [captainPicks, setCaptainPicks] = useState([]);

  // Host controls state
  const [resultTeam, setResultTeam] = useState('');
  const [resultType, setResultType] = useState('group_win');
  const [bonusPlayer, setBonusPlayer] = useState('');
  const [bonusPoints, setBonusPoints] = useState('');
  const [bonusDesc, setBonusDesc] = useState('');
  const [saving, setSaving] = useState(false);
  const [hostMsg, setHostMsg] = useState('');

  useEffect(() => {
    async function load() {
      const [teamsRes, playersRes, picksRes, playerPicksRes, captainRes] = await Promise.all([
        supabase.from('teams').select('*'),
        supabase.from('players').select('*'),
        supabase.from('draft_picks').select('*').eq('game_id', gameId),
        supabase.from('player_picks').select('*').eq('game_id', gameId),
        supabase.from('captain_picks').select('*').eq('game_id', gameId),
      ]);
      if (teamsRes.data) setTeams(teamsRes.data);
      if (playersRes.data) setAllPlayers(playersRes.data);
      if (picksRes.data) setPicks(picksRes.data);
      if (playerPicksRes.data) setPlayerPicks(playerPicksRes.data);
      if (captainRes.data) setCaptainPicks(captainRes.data);
    }
    load();
  }, [gameId]);

  // Build score map: game_player_id -> score row
  const scoreMap = {};
  scores.forEach((s) => { scoreMap[s.game_player_id] = s; });

  // Build captain map: game_player_id -> player_api_id
  const captainMap = {};
  captainPicks.forEach((c) => { captainMap[c.game_player_id] = c.player_api_id; });

  async function recomputeScores() {
    // Reload all scores from breakdown and resum
    for (const player of players) {
      const existing = scoreMap[player.id];
      if (existing) {
        const breakdown = existing.breakdown || {};
        let total = 0;
        for (const [, val] of Object.entries(breakdown)) {
          if (typeof val === 'number') total += val;
        }
        await supabase
          .from('user_scores')
          .upsert({
            game_id: gameId,
            game_player_id: player.id,
            total_points: total,
            breakdown,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'game_id,game_player_id' });
      }
    }
  }

  async function ensureScoreRow(gamePlayerId) {
    const { data } = await supabase
      .from('user_scores')
      .select('*')
      .eq('game_id', gameId)
      .eq('game_player_id', gamePlayerId)
      .single();
    if (!data) {
      await supabase.from('user_scores').insert({
        game_id: gameId,
        game_player_id: gamePlayerId,
        total_points: 0,
        breakdown: {},
      });
      return { total_points: 0, breakdown: {} };
    }
    return data;
  }

  async function applyTeamResult() {
    if (!resultTeam || saving) return;
    setSaving(true);
    setHostMsg('');
    try {
      const resultDef = RESULT_TYPES.find((r) => r.value === resultType);
      const pts = resultDef ? resultDef.points : 0;

      // Find all draft picks for this team in this game
      const teamPicks = picks.filter((p) => String(p.team_api_id) === String(resultTeam));

      for (const pick of teamPicks) {
        const score = await ensureScoreRow(pick.game_player_id);
        const breakdown = { ...(score.breakdown || {}) };
        const key = `team_${resultType}`;
        breakdown[key] = (breakdown[key] || 0) + pts;
        const total = Object.values(breakdown).reduce((a, b) => a + b, 0);
        await supabase.from('user_scores').upsert({
          game_id: gameId,
          game_player_id: pick.game_player_id,
          total_points: total,
          breakdown,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'game_id,game_player_id' });
      }
      setHostMsg(`✓ Applied ${resultDef?.label} (+${pts} pts) to ${teamPicks.length} players`);
      setResultTeam('');
    } catch (err) {
      setHostMsg('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function applyBonus() {
    if (!bonusPlayer || bonusPoints === '' || saving) return;
    setSaving(true);
    setHostMsg('');
    try {
      const pts = Number(bonusPoints);
      const score = await ensureScoreRow(bonusPlayer);
      const breakdown = { ...(score.breakdown || {}) };
      const key = bonusDesc ? `bonus_${bonusDesc.replace(/\s+/g, '_').toLowerCase()}` : 'bonus';
      breakdown[key] = (breakdown[key] || 0) + pts;
      const total = Object.values(breakdown).reduce((a, b) => a + b, 0);
      await supabase.from('user_scores').upsert({
        game_id: gameId,
        game_player_id: bonusPlayer,
        total_points: total,
        breakdown,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'game_id,game_player_id' });
      setHostMsg(`✓ Applied +${pts} pts to player`);
      setBonusPlayer('');
      setBonusPoints('');
      setBonusDesc('');
    } catch (err) {
      setHostMsg('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleOverride(player, points, reason) {
    try {
      const score = await ensureScoreRow(player.id);
      const breakdown = { ...(score.breakdown || {}) };
      const key = reason ? `override_${reason.replace(/\s+/g, '_').toLowerCase()}` : 'override';
      breakdown[key] = points;
      const total = Object.values(breakdown).reduce((a, b) => a + b, 0);
      await supabase.from('user_scores').upsert({
        game_id: gameId,
        game_player_id: player.id,
        total_points: total,
        breakdown,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'game_id,game_player_id' });
    } catch (err) {
      console.error('Override error', err);
    }
  }

  // Sort players by score
  const rankedPlayers = [...players].sort((a, b) => {
    const aScore = scoreMap[a.id]?.total_points || 0;
    const bScore = scoreMap[b.id]?.total_points || 0;
    return bScore - aScore;
  });

  const teamOptions = [...new Set(picks.map((p) => p.team_api_id))];
  const teamMap = {};
  teams.forEach((t) => { teamMap[t.api_id] = t; });

  return (
    <div className="page">
      <div className="flex items-center justify-between" style={{ marginBottom: '1.5rem' }}>
        <h1 className="title">Leaderboard</h1>
        {isHost && (
          <button className="btn btn-sm btn-secondary" onClick={recomputeScores}>
            ↻ Recompute
          </button>
        )}
      </div>

      {/* Host Controls */}
      {isHost && (
        <div className="card-section" style={{ marginBottom: '1.5rem', borderColor: 'rgba(255,215,0,0.2)' }}>
          <div className="section-header">
            <span className="section-title">🎮 Host Controls</span>
            <span className="badge badge-gold">Host</span>
          </div>

          {hostMsg && (
            <div style={{
              padding: '0.6rem 0.85rem', borderRadius: 8, marginBottom: '1rem',
              background: hostMsg.startsWith('Error') ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
              border: `1px solid ${hostMsg.startsWith('Error') ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}`,
              color: hostMsg.startsWith('Error') ? 'var(--red)' : 'var(--green)',
              fontSize: '0.88rem',
            }}>
              {hostMsg}
            </div>
          )}

          <div className="grid-2" style={{ gap: '1.5rem' }}>
            {/* Team result */}
            <div>
              <div className="label" style={{ marginBottom: '0.6rem' }}>Award Team Result</div>
              <div className="input-group">
                <label>Team</label>
                <select className="select" value={resultTeam} onChange={(e) => setResultTeam(e.target.value)}>
                  <option value="">Select team...</option>
                  {teamOptions.map((apiId) => {
                    const t = teamMap[apiId];
                    return (
                      <option key={apiId} value={apiId}>{t?.name || apiId}</option>
                    );
                  })}
                </select>
              </div>
              <div className="input-group">
                <label>Result</label>
                <select className="select" value={resultType} onChange={(e) => setResultType(e.target.value)}>
                  {RESULT_TYPES.map((r) => (
                    <option key={r.value} value={r.value}>{r.label} (+{r.points})</option>
                  ))}
                </select>
              </div>
              <button
                className="btn btn-primary btn-sm"
                onClick={applyTeamResult}
                disabled={saving || !resultTeam}
              >
                {saving ? 'Applying...' : 'Apply Result'}
              </button>
            </div>

            {/* Player bonus */}
            <div>
              <div className="label" style={{ marginBottom: '0.6rem' }}>Add Player Bonus</div>
              <div className="input-group">
                <label>Player</label>
                <select className="select" value={bonusPlayer} onChange={(e) => setBonusPlayer(e.target.value)}>
                  <option value="">Select player...</option>
                  {players.map((p) => (
                    <option key={p.id} value={p.id}>{p.player_name}</option>
                  ))}
                </select>
              </div>
              <div className="input-group">
                <label>Points</label>
                <input
                  className="input"
                  type="number"
                  placeholder="e.g. 10"
                  value={bonusPoints}
                  onChange={(e) => setBonusPoints(e.target.value)}
                />
              </div>
              <div className="input-group">
                <label>Description</label>
                <input
                  className="input"
                  placeholder="e.g. Golden Boot"
                  value={bonusDesc}
                  onChange={(e) => setBonusDesc(e.target.value)}
                />
              </div>
              <button
                className="btn btn-primary btn-sm"
                onClick={applyBonus}
                disabled={saving || !bonusPlayer || bonusPoints === ''}
              >
                {saving ? 'Applying...' : 'Apply Bonus'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard */}
      {scoresLoading ? (
        <div className="loading-page">
          <div className="spinner" />
        </div>
      ) : rankedPlayers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🏆</div>
          <p>No players yet.</p>
        </div>
      ) : (
        <div>
          {rankedPlayers.map((player, i) => (
            <LeaderboardRow
              key={player.id}
              rank={i + 1}
              player={player}
              score={scoreMap[player.id]}
              picks={picks}
              playerPicks={playerPicks}
              captainPickId={captainMap[player.id]}
              teams={teams}
              players={allPlayers}
              isExpanded={expandedId === player.id}
              onToggle={() => setExpandedId(expandedId === player.id ? null : player.id)}
              isHost={isHost}
              onOverride={handleOverride}
            />
          ))}
        </div>
      )}
    </div>
  );
}
