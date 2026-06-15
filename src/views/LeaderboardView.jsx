import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useScores } from '../hooks/useScores.js';
import { usePlayers } from '../hooks/usePlayers.js';
import { useDraft } from '../hooks/useDraft.js';
import { getSession } from '../lib/session.js';
import { supabase } from '../lib/supabase.js';
import { RESULT_TYPES, SCORING, normalizePosition } from '../lib/constants.js';
import LeaderboardRow from '../components/LeaderboardRow.jsx';
import SubstitutionModal from '../components/SubstitutionModal.jsx';
import { getSquadForTeam } from '../lib/wcSquads.js';

export default function LeaderboardView() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const { scores, loading: scoresLoading } = useScores(gameId);
  const { players } = usePlayers(gameId);
  const { picks } = useDraft(gameId);
  const session = getSession();
  const isHost = Boolean(session?.hostToken);
  const [linkedGameId, setLinkedGameId] = useState(null);

  useEffect(() => {
    supabase.from('games').select('linked_game_id').eq('id', gameId).single()
      .then(({ data }) => { if (data?.linked_game_id) setLinkedGameId(data.linked_game_id); });
  }, [gameId]);

  const [teams, setTeams] = useState([]);
  const [allPlayers, setAllPlayers] = useState([]);
  const [playerPicksAll, setPlayerPicksAll] = useState([]);
  const [captainPicksAll, setCaptainPicksAll] = useState([]);
  const [expandedRow, setExpandedRow] = useState(null);

  // Substitutions
  const [mySubModal, setMySubModal] = useState(null); // { draftPick, team, currentPlayers }
  const [mySubstitutions, setMySubstitutions] = useState([]); // rows from DB
  const [myPlayerPicks, setMyPlayerPicks] = useState([]);
  const [squadPlayers, setSquadPlayers] = useState({}); // teamApiId -> player objects

  // Host controls
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [selectedResultType, setSelectedResultType] = useState('group_win');
  const [bonusPlayerId, setBonusPlayerId] = useState('');
  const [bonusPoints, setBonusPoints] = useState('');
  const [bonusDesc, setBonusDesc] = useState('');
  const [hostLoading, setHostLoading] = useState(false);
  const [hostMsg, setHostMsg] = useState('');

  useEffect(() => {
    async function loadData() {
      const myId = session?.playerId;
      const [{ data: teamsData }, { data: playersData }, { data: ppData }, { data: cpData }, { data: subsData }, { data: myPpData }] = await Promise.all([
        supabase.from('teams').select('*'),
        supabase.from('players').select('*'),
        supabase.from('player_picks').select('*').eq('game_id', gameId),
        supabase.from('captain_picks').select('*').eq('game_id', gameId),
        supabase.from('substitutions').select('*').eq('game_id', gameId).eq('game_player_id', myId || ''),
        supabase.from('player_picks').select('*').eq('game_id', gameId).eq('game_player_id', myId || ''),
      ]);
      setTeams(teamsData || []);
      setAllPlayers(playersData || []);
      setPlayerPicksAll(ppData || []);
      setCaptainPicksAll(cpData || []);
      setMySubstitutions(subsData || []);
      setMyPlayerPicks(myPpData || []);

      // Build squad player lookup from DB or fallback for my teams
      if (teamsData && myPpData) {
        const myPickTeamIds = [...new Set((ppData || []).filter(p => p.game_player_id === myId).map(p => p.team_api_id))];
        const lookup = {};
        for (const tid of myPickTeamIds) {
          const { data: tPlayers } = await supabase.from('players').select('*').eq('team_api_id', String(tid));
          if (tPlayers && tPlayers.length > 0) {
            lookup[tid] = tPlayers;
          } else {
            const team = (teamsData || []).find(t => String(t.api_id) === String(tid));
            const raw = team ? getSquadForTeam(team.name) : null;
            lookup[tid] = raw ? raw.map(p => ({ api_id: p.id, name: p.name, position: p.position, isTop: p.isTop })) : [];
          }
        }
        setSquadPlayers(lookup);
      }
    }
    loadData();
  }, [gameId]);

  async function handleAddTeamResult() {
    if (!selectedTeamId || hostLoading) return;
    setHostLoading(true);
    setHostMsg('');
    try {
      const pts = SCORING[selectedResultType] || 0;
      // Find all game_players who have this team
      const gamePickers = picks
        .filter(p => p.team_api_id === selectedTeamId)
        .map(p => p.game_player_id);

      for (const gpId of gamePickers) {
        // Get or create user_scores row
        const { data: existing } = await supabase
          .from('user_scores')
          .select('*')
          .eq('game_id', gameId)
          .eq('game_player_id', gpId)
          .single();

        const currentBreakdown = existing?.breakdown || {};
        const teamKey = `team_${selectedTeamId}_${selectedResultType}`;
        const newBreakdown = { ...currentBreakdown, [teamKey]: (currentBreakdown[teamKey] || 0) + pts };
        const newTotal = Object.values(newBreakdown).reduce((a, b) => a + b, 0);

        await supabase.from('user_scores').upsert({
          game_id: gameId,
          game_player_id: gpId,
          total_points: newTotal,
          breakdown: newBreakdown,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'game_id,game_player_id' });
      }
      setHostMsg(`Added ${pts} pts to ${gamePickers.length} player(s) for ${selectedResultType}`);
    } catch (err) {
      setHostMsg(`Error: ${err.message}`);
    } finally {
      setHostLoading(false);
    }
  }

  async function handleAddBonus() {
    if (!bonusPlayerId || !bonusPoints || hostLoading) return;
    setHostLoading(true);
    setHostMsg('');
    try {
      const pts = Number(bonusPoints);
      const { data: existing } = await supabase
        .from('user_scores')
        .select('*')
        .eq('game_id', gameId)
        .eq('game_player_id', bonusPlayerId)
        .single();

      const currentBreakdown = existing?.breakdown || {};
      const bonusKey = `bonus_${Date.now()}`;
      const newBreakdown = { ...currentBreakdown, [bonusKey]: pts };
      if (bonusDesc) newBreakdown[`bonus_desc_${Date.now()}`] = bonusDesc;
      const newTotal = Object.values(newBreakdown).filter(v => typeof v === 'number').reduce((a, b) => a + b, 0);

      await supabase.from('user_scores').upsert({
        game_id: gameId,
        game_player_id: bonusPlayerId,
        total_points: newTotal,
        breakdown: newBreakdown,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'game_id,game_player_id' });

      setHostMsg(`Added ${pts} bonus points`);
      setBonusPoints('');
      setBonusDesc('');
    } catch (err) {
      setHostMsg(`Error: ${err.message}`);
    } finally {
      setHostLoading(false);
    }
  }

  async function handleRecalculate() {
    setHostLoading(true);
    setHostMsg('Syncing match events...');
    const HEADERS = { 'Content-Type': 'application/json', 'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhtYXNhYXB3Ymh4dWV1aHh4cWtkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4MTI1OTgsImV4cCI6MjA5NjM4ODU5OH0.pAdFowezL_l7QLLA0Y4KgyGAcDbYtx0OppA_id1agdY' };
    const BASE = 'https://hmasaapwbhxueuhxxqkd.supabase.co/functions/v1';
    try {
      // Step 1: sync latest match events from ESPN
      await fetch(`${BASE}/sync-match-events`, { method: 'POST', headers: HEADERS, body: '{}' });
      setHostMsg('Calculating scores...');
      // Step 2: calculate scores
      const res = await fetch(`${BASE}/calculate-scores`, {
        method: 'POST', headers: HEADERS,
        body: JSON.stringify({ game_id: gameId }),
      });
      const data = await res.json();
      if (data.success) {
        setHostMsg(`✓ Done — ${data.fixtures_processed} fixtures, ${data.events_processed} events, ${data.players_updated} players updated`);
      } else {
        setHostMsg(`Error: ${data.error}`);
      }
    } catch (err) {
      setHostMsg(`Error: ${err.message}`);
    } finally {
      setHostLoading(false);
    }
  }

  async function handleOverride(gpId, newTotal) {
    setHostLoading(true);
    try {
      await supabase.from('user_scores').upsert({
        game_id: gameId,
        game_player_id: gpId,
        total_points: newTotal,
        breakdown: { override: newTotal },
        updated_at: new Date().toISOString(),
      }, { onConflict: 'game_id,game_player_id' });
      setHostMsg(`Override applied: ${newTotal} pts`);
    } catch (err) {
      setHostMsg(`Error: ${err.message}`);
    } finally {
      setHostLoading(false);
    }
  }

  // Build leaderboard entries: merge players with scores
  const leaderboardEntries = players.map(player => {
    const score = scores.find(s => s.game_player_id === player.id);
    return { player, score };
  }).sort((a, b) => (b.score?.total_points || 0) - (a.score?.total_points || 0));

  const captainMap = {};
  for (const cp of captainPicksAll) {
    captainMap[cp.game_player_id] = cp.player_api_id;
  }

  // My teams with player picks (accounting for subs)
  const myId = session?.playerId;
  const myDraftPicks = picks.filter(p => p.game_player_id === myId);

  function getActivePlayers(draftPickId, teamApiId) {
    const base = myPlayerPicks.filter(p => p.draft_pick_id === draftPickId);
    const sub = mySubstitutions.find(s => s.draft_pick_id === draftPickId);
    if (!sub) return base;
    return base.map(p => p.player_api_id === sub.old_player_api_id
      ? { ...p, player_api_id: sub.new_player_api_id, subbed: true }
      : p
    );
  }

  function resolvePlayerName(apiId, teamApiId) {
    const dbPlayer = allPlayers.find(p => String(p.api_id) === String(apiId));
    if (dbPlayer) return dbPlayer.name;
    const squad = squadPlayers[teamApiId] || [];
    const local = squad.find(p => String(p.api_id) === String(apiId));
    return local?.name || `#${apiId}`;
  }

  function resolvePlayerPos(apiId, teamApiId) {
    const dbPlayer = allPlayers.find(p => String(p.api_id) === String(apiId));
    if (dbPlayer) return normalizePosition(dbPlayer.position);
    const squad = squadPlayers[teamApiId] || [];
    const local = squad.find(p => String(p.api_id) === String(apiId));
    return local ? normalizePosition(local.position) : '?';
  }

  const POS_COLOR = { GK: 'var(--gold)', DEF: 'var(--success)', MID: '#3b82f6', FWD: 'var(--danger)' };

  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <h1 className="page-title" style={{ margin: 0 }}>Leaderboard</h1>
        {isHost && linkedGameId && (
          <button
            className="btn btn-sm"
            style={{ background: 'rgba(59,130,246,0.1)', color: 'var(--info)', border: '1px solid rgba(59,130,246,0.3)' }}
            onClick={() => navigate(`/leaderboard/${linkedGameId}`)}
          >
            👁 Group B →
          </button>
        )}
      </div>

      {/* My Squad & Subs — shown to logged-in users */}
      {myId && myDraftPicks.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div className="section-header">My Squad</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {myDraftPicks.map(dp => {
              const team = teams.find(t => String(t.api_id) === String(dp.team_api_id));
              const activePlayers = getActivePlayers(dp.id, dp.team_api_id);
              const subUsed = mySubstitutions.some(s => s.draft_pick_id === dp.id);
              return (
                <div key={dp.id} className="card" style={{ padding: '12px 14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{team?.name || dp.team_code}</span>
                    {subUsed ? (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Sub used ✓</span>
                    ) : (
                      <button
                        className="btn btn-sm"
                        style={{ fontSize: '0.75rem', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
                        onClick={() => setMySubModal({ draftPick: dp, team, currentPlayers: activePlayers })}
                      >
                        🔄 Sub
                      </button>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {activePlayers.map(p => {
                      const pos = resolvePlayerPos(p.player_api_id, dp.team_api_id);
                      return (
                        <span key={p.player_api_id} style={{
                          fontSize: '0.78rem', fontWeight: 600,
                          padding: '3px 8px', borderRadius: 100,
                          background: 'rgba(255,255,255,0.05)',
                          border: `1px solid ${POS_COLOR[pos] || 'var(--border)'}`,
                          color: p.subbed ? 'var(--success)' : 'var(--text)',
                        }}>
                          <span style={{ fontSize: '0.65rem', color: POS_COLOR[pos], fontWeight: 700, marginRight: 4 }}>{pos}</span>
                          {resolvePlayerName(p.player_api_id, dp.team_api_id)}
                          {p.subbed && ' ↑'}
                        </span>
                      );
                    })}
                    {activePlayers.length === 0 && <span className="text-muted text-sm">No players picked</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {mySubModal && (
        <SubstitutionModal
          gameId={gameId}
          gamePlayerId={myId}
          draftPick={mySubModal.draftPick}
          team={mySubModal.team}
          currentPlayers={mySubModal.currentPlayers}
          onClose={() => setMySubModal(null)}
          onDone={({ draftPickId, oldId, newId }) => {
            setMySubstitutions(prev => [...prev, { draft_pick_id: draftPickId, old_player_api_id: oldId, new_player_api_id: newId }]);
            setMySubModal(null);
          }}
        />
      )}

      {scoresLoading ? (
        <div className="loading"><div className="spinner" /></div>
      ) : leaderboardEntries.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon">🏆</div>
          <div className="empty-state__text">No scores yet</div>
        </div>
      ) : (
        <div>
          {leaderboardEntries.map(({ player, score }, i) => (
            <LeaderboardRow
              key={player.id}
              rank={i + 1}
              player={player}
              score={score}
              picks={picks}
              playerPicks={playerPicksAll}
              captainPickId={captainMap[player.id]}
              teams={teams}
              players={allPlayers}
              isExpanded={expandedRow === player.id}
              onToggle={() => setExpandedRow(expandedRow === player.id ? null : player.id)}
              isHost={isHost}
              onOverride={isHost ? handleOverride : null}
            />
          ))}
        </div>
      )}

      {isHost && (
        <div className="card mt-24">
          <div className="section-header">Host Controls</div>

          {hostMsg && (
            <div style={{ padding: '10px 14px', background: 'var(--border)', borderRadius: 'var(--radius-sm)', marginBottom: 16, fontSize: '0.85rem', color: 'var(--success)' }}>
              {hostMsg}
            </div>
          )}

          {/* Recalculate from fixtures */}
          <div style={{ marginBottom: 20 }}>
            <button className="btn btn-primary btn-full" onClick={handleRecalculate} disabled={hostLoading}>
              🔄 Recalculate Scores from Fixtures
            </button>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 6 }}>
              Automatically awards points for all completed matches based on each player's drafted teams.
            </p>
          </div>

          {/* Add Team Result */}
          <div style={{ marginBottom: 20 }}>
            <div className="label">Add Team Result</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <select className="select" style={{ flex: 1 }} value={selectedTeamId} onChange={e => setSelectedTeamId(e.target.value)}>
                <option value="">Select team...</option>
                {teams.map(t => (
                  <option key={t.api_id} value={t.api_id}>{t.name}</option>
                ))}
              </select>
              <select className="select" style={{ flex: 1 }} value={selectedResultType} onChange={e => setSelectedResultType(e.target.value)}>
                {RESULT_TYPES.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
              <button className="btn btn-primary" onClick={handleAddTeamResult} disabled={!selectedTeamId || hostLoading}>
                Apply
              </button>
            </div>
          </div>

          {/* Add Player Bonus */}
          <div>
            <div className="label">Add Player Bonus</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
              <select className="select" style={{ flex: 1 }} value={bonusPlayerId} onChange={e => setBonusPlayerId(e.target.value)}>
                <option value="">Select player...</option>
                {players.map(p => (
                  <option key={p.id} value={p.id}>{p.player_name}</option>
                ))}
              </select>
              <input
                type="number"
                className="input"
                style={{ width: 100 }}
                placeholder="Points"
                value={bonusPoints}
                onChange={e => setBonusPoints(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                className="input"
                placeholder="Description (optional)"
                value={bonusDesc}
                onChange={e => setBonusDesc(e.target.value)}
              />
              <button className="btn btn-primary" onClick={handleAddBonus} disabled={!bonusPlayerId || !bonusPoints || hostLoading}>
                Add Bonus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
