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

  const isHost = session?.hostToken && game?.host_token === session.hostToken;

  // Navigate when game status changes from lobby
  useEffect(() => {
    if (!game) return;
    if (game.status === 'drafting_teams') {
      navigate(`/draft/${gameId}`);
    } else if (game.status !== 'lobby') {
      navigate(`/draft/${gameId}`);
    }
  }, [game?.status, gameId, navigate]);

  async function handleStartDraft() {
    await supabase
      .from('games')
      .update({ status: 'drafting_teams' })
      .eq('id', gameId);
  }

  if (gameLoading) {
    return <div className="loading-page"><div className="spinner" /></div>;
  }

  if (!game) {
    return (
      <div className="page-center">
        <p className="text-muted">Game not found.</p>
      </div>
    );
  }

  return (
    <div className="page">
      <div style={{ maxWidth: '480px', margin: '0 auto' }}>
        <div className="text-center" style={{ marginBottom: '32px' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🏆</div>
          <h1 style={{ color: 'var(--gold)' }}>Game Lobby</h1>
          <p className="text-muted text-sm">Share the code below so friends can join</p>
        </div>

        <div className="card" style={{ marginBottom: '20px' }}>
          <div className="section-title">Join Code</div>
          <CopyCode code={game.join_code} />
        </div>

        <div className="card" style={{ marginBottom: '24px' }}>
          <div className="section-title">
            Players ({players.length})
          </div>
          {playersLoading ? (
            <div className="spinner" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {players.map((p) => (
                <div
                  key={p.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 12px',
                    background: p.id === session?.playerId ? 'rgba(255,215,0,0.08)' : 'var(--border)',
                    borderRadius: '8px',
                    border: p.id === session?.playerId ? '1px solid rgba(255,215,0,0.3)' : '1px solid transparent',
                  }}
                >
                  <span style={{ fontSize: '1.1rem' }}>{p.is_host ? '👑' : '👤'}</span>
                  <span style={{ fontWeight: 600, flex: 1 }}>{p.player_name}</span>
                  {p.is_host && <span className="badge badge-gold">Host</span>}
                  {p.id === session?.playerId && !p.is_host && (
                    <span className="badge badge-info">You</span>
                  )}
                  {p.id === session?.playerId && p.is_host && (
                    <span className="badge badge-info">You</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {isHost ? (
          <div style={{ textAlign: 'center' }}>
            <button
              className="btn btn-primary btn-lg w-full"
              onClick={handleStartDraft}
              disabled={players.length < 2}
            >
              Start Draft 🚀
            </button>
            {players.length < 2 && (
              <p className="text-muted text-sm" style={{ marginTop: '8px' }}>
                Need at least 2 players to start
              </p>
            )}
          </div>
        ) : (
          <div className="card text-center">
            <div style={{ fontSize: '2rem', marginBottom: '8px' }}>⏳</div>
            <p className="text-muted">Waiting for the host to start the draft...</p>
          </div>
        )}
      </div>
    </div>
  );
}
