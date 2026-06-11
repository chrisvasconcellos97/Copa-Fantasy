import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGame } from '../hooks/useGame';
import { usePlayers } from '../hooks/usePlayers';
import { supabase } from '../lib/supabase';
import { getOrCreateToken } from '../lib/session';
import CopyCode from '../components/CopyCode';

export default function LobbyView() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const { game, loading: gameLoading } = useGame(gameId);
  const { players, loading: playersLoading } = usePlayers(gameId);
  const myToken = getOrCreateToken();

  const me = players.find(p => p.player_token === myToken);
  const isHost = me?.is_host;

  useEffect(() => {
    if (!game) return;
    if (game.status !== 'lobby') {
      navigate(`/draft/${gameId}`);
    }
  }, [game, gameId, navigate]);

  const handleStartDraft = async () => {
    await supabase.from('games').update({ status: 'drafting_teams' }).eq('id', gameId);
  };

  if (gameLoading || playersLoading) {
    return <div className="page"><div className="spinner" /></div>;
  }

  if (!game) {
    return <div className="page"><p className="text-muted text-center">Game not found.</p></div>;
  }

  return (
    <div className="page" style={{ maxWidth: 600 }}>
      <h1 className="h1 mb-2">Game Lobby</h1>
      <p className="text-muted mb-6">Share the code below and wait for everyone to join before starting.</p>

      <div className="card mb-4">
        <CopyCode code={game.join_code} />
      </div>

      <div className="card mb-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="h3">Players ({players.length})</h2>
          {isHost && (
            <span className="badge badge-gold">You're the Host</span>
          )}
        </div>
        {players.length === 0 ? (
          <p className="text-muted text-sm">No players yet...</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {players.map(p => (
              <div key={p.id} className="flex items-center gap-3" style={{ padding: '10px 12px', background: 'var(--navy-3)', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ fontSize: '1.2rem' }}>{p.is_host ? '👑' : '👤'}</span>
                <span className="font-bold">{p.player_name}</span>
                {p.player_token === myToken && <span className="badge badge-muted">You</span>}
                {p.is_host && <span className="badge badge-gold" style={{ marginLeft: 'auto' }}>Host</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      {isHost ? (
        <div className="card" style={{ textAlign: 'center' }}>
          <h3 className="h3 mb-2">Ready to Start?</h3>
          <p className="text-muted text-sm mb-4">
            {players.length < 2
              ? `Need at least 2 players. Currently ${players.length} player(s) joined.`
              : `${players.length} players ready. Start the snake draft!`}
          </p>
          <button
            className="btn btn-gold btn-lg"
            onClick={handleStartDraft}
            disabled={players.length < 1}
          >
            Start Draft 🚀
          </button>
        </div>
      ) : (
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: 8 }}>⏳</div>
          <h3 className="h3 mb-2">Waiting for Host</h3>
          <p className="text-muted text-sm">The host will start the draft when everyone is ready.</p>
        </div>
      )}
    </div>
  );
}
