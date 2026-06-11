import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useScores } from '../hooks/useScores';
import { usePlayers } from '../hooks/usePlayers';
import { supabase } from '../lib/supabase';
import { getOrCreateToken } from '../lib/session';
import { computeScoreForPlayer } from '../lib/scoring';
import LeaderboardRow from '../components/LeaderboardRow';

export default function LeaderboardView() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const { scores, loading: scoresLoading } = useScores(gameId);
  const { players } = usePlayers(gameId);
  const myToken = getOrCreateToken();

  const [expandedId, setExpandedId] = useState(null);
  const [teams, setTeams] = useState([]);
  const [allPlayers, setAllPlayers] = useState([]);
  const [allPicks, setAllPicks] = useState([]);
  const [allPlayerPicks, setAllPlayerPicks] = useState([]);
  const [captainPicks, setCaptainPicks] = useState([]);
  const [recomputing, setRecomputing] = useState(false);

  const me = players.find(p => p.token === myToken);
  const isHost = me?.is_host;

  useEffect(() => {
    supabase.from('teams').select('*').then(({ data }) => setTeams(data || []));
    supabase.from('players').select('*').then(({ data }) => setAllPlayers(data || []));

    supabase.from('draft_picks').select('*').eq('game_id', gameId)
      .then(({ data }) => setAllPicks(data || []));
    supabase.from('player_picks').select('*').eq('game_id', gameId)
      .then(({ data }) => setAllPlayerPicks(data || []));
    supabase.from('captain_picks').select('*').eq('game_id', gameId)
      .then(({ data }) => setCaptainPicks(data || []));
  }, [gameId]);

  async function recomputeScores() {
    setRecomputing(true);
    try {
      const { data: teamResults } = await supabase.from('team_results').select('*');
      const { data: playerResults } = await supabase.from('player_results').select('*');

      for (const player of players) {
        const myTeamApiIds = allPicks
          .filter(p => p.player_id === player.id)
          .map(p => String(p.team_api_id));
        const myPlayerApiIds = allPlayerPicks
          .filter(p => p.player_id === player.id)
          .map(p => String(p.player_api_id));
        const captainPick = captainPicks.find(c => c.player_id === player.id);

        const totalPoints = computeScoreForPlayer({
          teamApiIds: myTeamApiIds,
          teamResults: teamResults || [],
          playerApiIds: myPlayerApiIds,
          playerResults: playerResults || [],
          captainPlayerApiId: captainPick?.player_api_id || null,
        });

        await supabase.from('user_scores').upsert({
          game_id: gameId,
          player_id: player.id,
          total_points: totalPoints,
        }, { onConflict: 'game_id,player_id' });
      }
    } catch (e) {
      alert('Error recomputing: ' + e.message);
    }
    setRecomputing(false);
  }

  async function handleOverride(playerId, adjustment) {
    const current = scores.find(s => s.player_id === playerId);
    const newPts = (current?.total_points || 0) + adjustment;
    await supabase.from('user_scores').upsert({
      game_id: gameId,
      player_id: playerId,
      total_points: newPts,
    }, { onConflict: 'game_id,player_id' });
  }

  const scoreMap = {};
  for (const s of scores) scoreMap[s.player_id] = s;

  // Sort players by score
  const ranked = [...players].sort((a, b) => {
    const sa = scoreMap[a.id]?.total_points ?? 0;
    const sb = scoreMap[b.id]?.total_points ?? 0;
    return sb - sa;
  });

  const captainMap = {};
  for (const c of captainPicks) captainMap[c.player_id] = c.player_api_id;

  return (
    <div className="page">
      <div className="flex justify-between items-center mb-24">
        <h2>Leaderboard</h2>
        <div className="flex gap-8">
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/matches')}>
            Matches
          </button>
          {isHost && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={recomputeScores}
              disabled={recomputing}
            >
              {recomputing ? '…' : '↻ Recalculate'}
            </button>
          )}
        </div>
      </div>

      {scoresLoading ? (
        <div className="flex-center" style={{ paddingTop: 60 }}>
          <div className="spinner" />
        </div>
      ) : (
        <div>
          {ranked.map((player, i) => (
            <LeaderboardRow
              key={player.id}
              rank={i + 1}
              player={player}
              score={scoreMap[player.id]}
              picks={allPicks}
              playerPicks={allPlayerPicks}
              captainPickId={captainMap[player.id]}
              teams={teams}
              players={allPlayers}
              isExpanded={expandedId === player.id}
              onToggle={() => setExpandedId(expandedId === player.id ? null : player.id)}
              isHost={isHost}
              onOverride={handleOverride}
            />
          ))}
          {ranked.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--muted)', paddingTop: 60 }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🏆</div>
              <p>No players yet.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
