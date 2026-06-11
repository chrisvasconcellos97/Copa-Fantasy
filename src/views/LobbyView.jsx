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
  const { game, loading } = useGame(gameId);
  const { players } = usePlayers(gameId);
  const session = getSession();
  const isHost = Boolean(session?.hostToken);

  useEffect(() => {
    if (!game) return;
    if (game.status !== 'lobby') {
      navigate(`/draft/${gameId}`, { replace: true });
    }
  }, [game, gameId, navigate]);

  async function handleStartDraft() {
    const { error } = await supabase
      .from('games')
      .update({ status: 'drafting_teams' })
      .eq('id', gameId);
    if (error) alert(error.message);
  }

  if (loading) {
    return (
      <div className="loading-center">
        <div className="spinner" />
      </div>
    );
  }

  if (!game) {
    return (
      <div className="page text-center">
        <p className="text-muted">Game not found.</p>
      </div>
    );
  }

  return (
    <div className="page container">
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{ fontSize: '2rem', marginBottom: 8 }}>🏟️</div>
        <h1 style={{ color: 'var(--gold)', marginBottom: 4 }}>Game Lobby</h1>
        <p style={{ color: 'var(--text-muted)' }}>Share the code below with friends to join</p>
      </div>

      <div className="card" style={{ textAlign: 'center', marginBottom: 24 }}>
        <p style={{ color: 'var(--text-muted)', marginBottom: 16, fontSize: '0.9rem' }}>Join Code</p>
        <CopyCode code={game.join_code} />
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ marginBottom: 16 }}>
          Players ({players.length})
        </h3>
        {players.length === 0 ? (
          <p className="text-muted text-sm">No players yet...</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {players.map((player) => (
              <div
                key={player.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 14px',
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                }}
              >
                <span style={{ fontSize: '1.2rem' }}>
                  {player.is_host ? '👑' : '👤'}
                </span>
                <span style={{ fontWeight: 600 }}>{player.player_name}</span>
                {player.is_host && (
                  <span className="badge badge-gold" style={{ marginLeft: 'auto' }}>Host</span>
                )}
                {player.id === session?.playerId && !player.is_host && (
                  <span className="badge badge-muted" style={{ marginLeft: 'auto' }}>You</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ textAlign: 'center' }}>
        {isHost ? (
          <div>
            <button
              className="btn btn-primary btn-lg"
              onClick={handleStartDraft}
              disabled={players.length < 2}
            >
              🚀 Start Draft
            </button>
            {players.length < 2 && (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 8 }}>
                Need at least 2 players to start
              </p>
            )}
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              justifyContent: 'center',
              color: 'var(--text-muted)',
            }}
          >
            <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
            <span>Waiting for host to start the draft...</span>
          </div>
        )}
      </div>
    </div>
  );
}
