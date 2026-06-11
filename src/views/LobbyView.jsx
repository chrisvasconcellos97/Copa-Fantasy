import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGame } from '../hooks/useGame';
import { usePlayers } from '../hooks/usePlayers';
import { supabase } from '../lib/supabase';
import CopyCode from '../components/CopyCode';

function getSession() {
  try {
    return JSON.parse(localStorage.getItem('copa_session') || '{}');
  } catch {
    return {};
  }
}

export default function LobbyView() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const { game, loading: gameLoading } = useGame(gameId);
  const { players, loading: playersLoading } = usePlayers(gameId);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');

  const session = getSession();
  const isHost = !!session.hostToken;
  const myPlayerId = session.playerId;

  // Navigate when game status changes away from lobby
  useEffect(() => {
    if (!game) return;
    if (game.status === 'drafting_teams' || game.status === 'selecting_players' ||
        game.status === 'selecting_captain' || game.status === 'tournament' || game.status === 'complete') {
      navigate(`/draft/${gameId}`);
    }
  }, [game, gameId, navigate]);

  async function handleStartDraft() {
    if (!isHost) return;
    setStarting(true);
    setError('');
    try {
      const { error: err } = await supabase
        .from('games')
        .update({ status: 'drafting_teams' })
        .eq('id', gameId);
      if (err) throw err;
    } catch (err) {
      setError(err.message || 'Failed to start draft.');
    } finally {
      setStarting(false);
    }
  }

  if (gameLoading) {
    return (
      <div className="page page-narrow loading-page">
        <div className="spinner" />
        <span>Loading lobby...</span>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="page page-narrow" style={{ textAlign: 'center', paddingTop: '2rem' }}>
        <p className="text-muted">Game not found.</p>
      </div>
    );
  }

  return (
    <div className="page page-narrow">
      <h1 className="title" style={{ marginBottom: '1.5rem' }}>Game Lobby</h1>

      <div className="card-section" style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
        <CopyCode code={game.join_code} />
        <p className="text-muted" style={{ marginTop: '0.75rem', fontSize: '0.88rem' }}>
          Share this code with friends to join
        </p>
      </div>

      <div className="card-section" style={{ marginBottom: '1.25rem' }}>
        <div className="section-header">
          <span className="section-title">Players</span>
          <span className="badge badge-muted">{players.length} joined</span>
        </div>
        {playersLoading ? (
          <div className="spinner" />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {players.map((player) => (
              <div
                key={player.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.6rem',
                  padding: '0.6rem 0.75rem',
                  background: player.id === myPlayerId ? 'rgba(255,215,0,0.06)' : 'transparent',
                  border: `1px solid ${player.id === myPlayerId ? 'rgba(255,215,0,0.25)' : 'var(--border)'}`,
                  borderRadius: 8,
                }}
              >
                <span style={{ fontSize: '1.1rem' }}>{player.is_host ? '👑' : '👤'}</span>
                <span style={{ fontWeight: 600 }}>{player.player_name}</span>
                {player.id === myPlayerId && (
                  <span className="badge badge-gold" style={{ marginLeft: 'auto', fontSize: '0.65rem' }}>You</span>
                )}
                {player.is_host && player.id !== myPlayerId && (
                  <span className="badge badge-muted" style={{ marginLeft: 'auto', fontSize: '0.65rem' }}>Host</span>
                )}
              </div>
            ))}
            {players.length === 0 && (
              <p className="text-muted" style={{ textAlign: 'center', padding: '1rem' }}>
                Waiting for players...
              </p>
            )}
          </div>
        )}
      </div>

      {error && (
        <div style={{ color: 'var(--red)', fontSize: '0.9rem', marginBottom: '0.75rem', textAlign: 'center' }}>
          {error}
        </div>
      )}

      {isHost ? (
        <button
          className="btn btn-primary btn-block btn-lg"
          onClick={handleStartDraft}
          disabled={starting || players.length < 1}
        >
          {starting ? 'Starting...' : '🚀 Start Draft'}
        </button>
      ) : (
        <div
          style={{
            textAlign: 'center', padding: '1.25rem',
            background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 12,
            color: 'var(--text-muted)',
          }}
        >
          <div style={{ fontSize: '1.5rem', marginBottom: '0.4rem' }}>⏳</div>
          <p>Waiting for the host to start the draft...</p>
        </div>
      )}
    </div>
  );
}
