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
  const myPlayerId = session?.playerId;
  const hostToken = session?.hostToken;
  const isHost = Boolean(hostToken);

  // Navigate when game status changes from lobby
  useEffect(() => {
    if (game && game.status !== 'lobby') {
      navigate(`/draft/${gameId}`, { replace: true });
    }
  }, [game, gameId, navigate]);

  async function handleStartDraft() {
    await supabase
      .from('games')
      .update({ status: 'drafting_teams' })
      .eq('id', gameId);
  }

  if (gameLoading) {
    return (
      <div className="loading-page">
        <div className="spinner" />
        <p>Loading lobby…</p>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="page-narrow">
        <p className="text-error">Game not found.</p>
      </div>
    );
  }

  return (
    <div className="page-narrow">
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1 style={{ marginBottom: '0.5rem' }}>Game Lobby</h1>
        <p className="text-muted">Waiting for all players to join…</p>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <CopyCode code={game.join_code} />
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="section-header">
          <h2 style={{ fontSize: '1rem' }}>Players ({players.length})</h2>
          {playersLoading && <div className="spinner" style={{ width: 20, height: 20, margin: 0, borderWidth: 2 }} />}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {players.map((p) => (
            <div
              key={p.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                padding: '0.6rem 0.75rem',
                background: '#0e0e16',
                borderRadius: 'var(--radius-sm)',
                border: `1px solid ${p.id === myPlayerId ? 'var(--gold)' : 'var(--border)'}`,
              }}
            >
              <span style={{ fontSize: '1rem' }}>{p.is_host ? '👑' : '👤'}</span>
              <span style={{ fontWeight: 600, flex: 1, color: p.id === myPlayerId ? 'var(--gold)' : 'var(--text)' }}>
                {p.player_name}
                {p.id === myPlayerId && <span className="text-muted text-xs" style={{ marginLeft: '0.4rem' }}>(you)</span>}
              </span>
              {p.is_host && (
                <span className="badge badge-gold">Host</span>
              )}
            </div>
          ))}
          {players.length === 0 && !playersLoading && (
            <p className="text-muted text-sm">No players yet…</p>
          )}
        </div>
      </div>

      {isHost ? (
        <div style={{ textAlign: 'center' }}>
          <button
            className="btn btn-primary btn-lg"
            onClick={handleStartDraft}
            disabled={players.length < 2}
            style={{ width: '100%' }}
          >
            🚀 Start Draft ({players.length} {players.length === 1 ? 'player' : 'players'})
          </button>
          {players.length < 2 && (
            <p className="text-muted text-sm" style={{ marginTop: '0.5rem' }}>
              Need at least 2 players to start.
            </p>
          )}
        </div>
      ) : (
        <div className="card" style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 0.75rem' }} />
          <p className="text-muted">Waiting for the host to start the draft…</p>
        </div>
      )}
    </div>
  );
}
