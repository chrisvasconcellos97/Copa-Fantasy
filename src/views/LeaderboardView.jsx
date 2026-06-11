import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useScores } from '../hooks/useScores';
import { usePlayers } from '../hooks/usePlayers';
import { useGame } from '../hooks/useGame';
import { supabase } from '../lib/supabase';
import { getOrCreateToken } from '../lib/session';
import LeaderboardRow from '../components/LeaderboardRow';

export default function LeaderboardView() {
  const { gameId } = useParams();
  const token = getOrCreateToken();
  const { game } = useGame(gameId);
  const { players } = usePlayers(gameId);
  const { scores, loading } = useScores(gameId);
  const [expanded, setExpanded] = useState(null);
  const [teams, setTeams] = useState([]);
  const [allPlayers, setAllPlayers] = useState([]);
  const [picks, setPicks] = useState([]);
  const [playerPicks, setPlayerPicks] = useState([]);
  const [captainPicks, setCaptainPicks] = useState([]);

  const isHost = game?.host_session_token === token;
  const me = players.find((p) => p.session_token === token);

  useEffect(() => {
    loadData();
  }, [gameId]);

  async function loadData() {
    const [teamsRes, playersRes, picksRes, ppRes, cpRes] = await Promise.all([
      supabase.from('teams').select('*'),
      supabase.from('players').select('*'),
      supabase.from('draft_picks').select('*').eq('game_id', gameId),
      supabase.from('player_picks').select('*').eq('game_id', gameId),
      supabase.from('captain_picks').select('*').eq('game_id', gameId),
    ]);
    if (teamsRes.data) setTeams(teamsRes.data);
    if (playersRes.data) setAllPlayers(playersRes.data);
    if (picksRes.data) setPicks(picksRes.data);
    if (ppRes.data) setPlayerPicks(ppRes.data);
    if (cpRes.data) setCaptainPicks(cpRes.data);
  }

  async function handleOverride(gamePlayerId, { delta, reason }) {
    await supabase.from('score_overrides').insert({
      game_id: gameId,
      game_player_id: gamePlayerId,
      delta_points: delta,
      reason,
    });
    // Trigger score recalc or just reload
    loadData();
  }

  if (loading) {
    return <div className="view"><div className="spinner" /></div>;
  }

  return (
    <div className="view">
      <div style={{ marginBottom: 20 }}>
        <h1>Leaderboard</h1>
        <p className="muted text-sm">
          {game?.status === 'tournament' ? '🔴 Tournament in progress' :
           game?.status === 'complete' ? '🏆 Tournament complete' :
           'Draft phase'}
        </p>
      </div>

      {scores.length === 0 && (
        <div className="empty-state">
          <div className="empty-state__icon">🏆</div>
          <div>No scores yet</div>
          <div className="muted text-sm" style={{ marginTop: 6 }}>Scores appear once the tournament begins</div>
        </div>
      )}

      {scores.map((score, idx) => {
        const player = players.find((p) => p.id === score.game_player_id);
        const myPicks = picks.filter((p) => p.player_id === score.game_player_id);
        const myPlayerPicks = playerPicks.filter((pp) => pp.game_player_id === score.game_player_id);
        const myCaptain = captainPicks.find((cp) => cp.game_player_id === score.game_player_id);

        return (
          <LeaderboardRow
            key={score.id}
            rank={idx + 1}
            player={player}
            score={score}
            picks={myPicks}
            playerPicks={myPlayerPicks}
            captainPickId={myCaptain?.player_pick_id}
            teams={teams}
            players={allPlayers}
            isExpanded={expanded === score.id}
            onToggle={() => setExpanded(expanded === score.id ? null : score.id)}
            isHost={isHost}
            onOverride={(data) => handleOverride(score.game_player_id, data)}
          />
        );
      })}

      {scores.length === 0 && players.length > 0 && (
        <div>
          <div className="section-title" style={{ marginTop: 24 }}>Players</div>
          {players.map((p, idx) => (
            <div key={p.id} className="card" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className="lb-row__rank">{idx + 1}</div>
              <div style={{ flex: 1, fontWeight: 700 }}>{p.name}</div>
              <div className="muted text-sm">0 pts</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
