import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGame } from '../hooks/useGame';
import { usePlayers } from '../hooks/usePlayers';
import { getSession } from '../lib/session';
import { supabase } from '../lib/supabase';
import CopyCode from '../components/CopyCode';

export default function LobbyView() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const { game, loading: gameLoading } = useGame(gameId);
  const { players, loading: playersLoading } = usePlayers(gameId);
  const session = getSession();
  const isHost = session?.hostToken && game?.host_token === session.hostToken;

  // Navigate when game status changes from lobby
  useEffect(() => {
    if (game && game.status !== 'lobby') {
      navigate(`/draft/${gameId}`, { replace: true });
    }
  }, [game, gameId, navigate]);

  async function handleStartDraft() {
    if (players.length < 1) {
      alert('Need at least 1 player to start the draft.');
      return;
    }
    const { error } = await supabase
      .from('games')
      .update({ status: 'drafting_teams' })
      .eq('id', gameId);
    if (error) alert('Failed to start draft: ' + error.message);
  }

  if (gameLoading) {
    return (
      <div className="loading">
        <div className="spinner" />
        Loading lobby...
      </div>
    );
  }

  if (!game) {
    return (
      <div className="page page-narrow">
        <div className="empty-state">
          <div className="empty-icon">❌</div>
          <p>Game not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page page-narrow">
      <h1 className="page-title">Game Lobby</h1>

      {/* Join code */}
      <CopyCode code={game.join_code} />

      {/* Players list */}
      <div className="card mt-24">
        <div className="flex items-center justify-between mb-16">
          <span className="section-title" style={{ margin: 0 }}>
            Players ({players.length})
          </span>
          <span className="badge badge-muted">
            Waiting for host...
          </span>
        </div>

        {playersLoading ? (
          <div className="loading" style={{ padding: 24 }}>
            <div className="spinner" />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {players.map((player) => (
              <div
                key={player.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(42,42,58,0.3)',
                  border: `1px solid ${player.id === session?.playerId ? 'rgba(255,215,0,0.3)' : 'var(--border)'}`,
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: player.is_host ? 'rgba(255,215,0,0.15)' : 'rgba(255,255,255,0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1rem',
                    flexShrink: 0,
                  }}
                >
                  {player.is_host ? '👑' : '👤'}
                </div>
                <span style={{ flex: 1, fontWeight: 600, color: player.id === session?.playerId ? 'var(--gold)' : 'var(--text)' }}>
                  {player.player_name}
                  {player.id === session?.playerId && (
                    <span className="text-muted text-xs" style={{ marginLeft: 8 }}>(you)</span>
                  )}
                </span>
                {player.is_host && (
                  <span className="badge badge-gold">HOST</span>
                )}
              </div>
            ))}

            {players.length === 0 && (
              <div className="empty-state" style={{ padding: 24 }}>
                <p>No players yet</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Host actions */}
      {isHost ? (
        <div className="mt-24">
          <button
            className="btn btn-primary btn-full btn-lg"
            onClick={handleStartDraft}
            disabled={players.length < 1}
          >
            🚀 Start Draft ({players.length} player{players.length !== 1 ? 's' : ''})
          </button>
          <p className="text-muted text-sm text-center mt-8">
            All players should join before starting the draft
          </p>
        </div>
      ) : (
        <div className="card mt-24" style={{ textAlign: 'center', padding: 24 }}>
          <div style={{ fontSize: '2rem', marginBottom: 8 }}>⏳</div>
          <p style={{ fontWeight: 600 }}>Waiting for host to start the draft...</p>
          <p className="text-muted text-sm mt-8">
            The host will start the draft once everyone has joined.
          </p>
        </div>
      )}
    </div>
  );
}
