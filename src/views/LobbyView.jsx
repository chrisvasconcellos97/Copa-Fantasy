import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getSession } from '../lib/session';
import { useGame } from '../hooks/useGame';
import { usePlayers } from '../hooks/usePlayers';
import CopyCode from '../components/CopyCode';

export default function LobbyView() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const session = getSession();
  const { game, loading: gameLoading } = useGame(gameId);
  const { players, loading: playersLoading } = usePlayers(gameId);

  const isHost = Boolean(session?.hostToken);

  // Navigate when status changes from lobby
  useEffect(() => {
    if (game && game.status !== 'lobby') {
      navigate(`/draft/${gameId}`, { replace: true });
    }
  }, [game, gameId, navigate]);

  async function handleStartDraft() {
    const { error } = await supabase
      .from('games')
      .update({ status: 'drafting_teams' })
      .eq('id', gameId);
    if (error) console.error(error);
  }

  if (gameLoading || playersLoading) {
    return (
      <div className="loading-page">
        <div className="loading-spinner" />
        <span>Loading lobby...</span>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="page">
        <div className="empty-state">
          <div className="empty-state__icon">🔍</div>
          <div className="empty-state__title">Game not found</div>
        </div>
      </div>
    );
  }

  return (
    <div className="page" style={{ maxWidth: 600, margin: '0 auto' }}>
      <h1 className="page-title">Game Lobby</h1>

      <div className="card mb-4">
        <CopyCode code={game.join_code} />
      </div>

      <div className="card mb-4">
        <div className="card-title">Players ({players.length})</div>
        {players.length === 0 ? (
          <div className="text-muted text-sm">Waiting for players to join...</div>
        ) : (
          <div className="flex flex-col gap-2">
            {players.map((player) => (
              <div
                key={player.id}
                className="flex items-center justify-between"
                style={{
                  padding: '10px 14px',
                  background: player.id === session?.playerId ? 'rgba(255,215,0,0.06)' : 'rgba(255,255,255,0.03)',
                  borderRadius: 8,
                  border: player.id === session?.playerId ? '1px solid rgba(255,215,0,0.2)' : '1px solid var(--border)',
                }}
              >
                <span className="font-semibold">
                  {player.player_name}
                  {player.id === session?.playerId && (
                    <span className="text-muted text-sm"> (you)</span>
                  )}
                </span>
                <div className="flex gap-2">
                  {player.is_host && <span className="badge badge-gold">HOST</span>}
                  <span className="badge badge-success">Ready</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isHost ? (
        <div className="card">
          <div className="card-title">Host Controls</div>
          <p className="text-sm text-muted mb-4">
            Once all players have joined, start the team draft. You need at least 2 players.
          </p>
          <button
            className="btn btn-primary btn-block btn-lg"
            onClick={handleStartDraft}
            disabled={players.length < 2}
          >
            🏁 Start Draft ({players.length} player{players.length !== 1 ? 's' : ''})
          </button>
          {players.length < 2 && (
            <p className="text-sm text-muted mt-2 text-center">Need at least 2 players to start</p>
          )}
        </div>
      ) : (
        <div className="card text-center">
          <div style={{ fontSize: '2rem', marginBottom: 12 }}>⏳</div>
          <div className="font-semibold mb-2">Waiting for host to start the draft</div>
          <div className="text-sm text-muted">The host will start the draft once everyone has joined</div>
        </div>
      )}
    </div>
  );
}
