import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getSession } from '../lib/session';
import { useGame } from '../hooks/useGame';
import { usePlayers } from '../hooks/usePlayers';
import CopyCode from '../components/CopyCode';

export default function LobbyView() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const { game, loading: gameLoading } = useGame(gameId);
  const { players, loading: playersLoading } = usePlayers(gameId);
  const session = getSession();
  const isHost = !!session?.hostToken;

  // Navigate when game starts
  useEffect(() => {
    if (game && game.status !== 'lobby') {
      navigate(`/draft/${gameId}`, { replace: true });
    }
  }, [game?.status, gameId, navigate]);

  async function handleStartDraft() {
    await supabase
      .from('games')
      .update({ status: 'drafting_teams' })
      .eq('id', gameId);
  }

  if (gameLoading) {
    return (
      <div className="page">
        <div className="loading">
          <div className="spinner" />
          <span>Loading lobby...</span>
        </div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="page">
        <div className="empty-state">
          <div className="empty-state-icon">❌</div>
          <div className="empty-state-title">Game not found</div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 560 }}>
        <div className="phase-banner mb-6">
          <div className="phase-banner-title">Waiting Room</div>
          <div className="phase-banner-sub">Share the code so friends can join</div>
        </div>

        <div className="card mb-4">
          <CopyCode code={game.join_code} />
        </div>

        <div className="card mb-4">
          <div className="section-title">
            Players ({players.length})
          </div>
          {playersLoading ? (
            <div className="loading" style={{ minHeight: 80 }}>
              <div className="spinner" style={{ width: 24, height: 24 }} />
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {players.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between"
                  style={{
                    padding: '0.6rem 0.75rem',
                    background: '#0f0f18',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                  }}
                >
                  <span className="font-semibold">
                    {p.player_name}
                    {p.id === session?.playerId && (
                      <span className="text-muted text-sm"> (you)</span>
                    )}
                  </span>
                  {p.is_host && (
                    <span className="badge badge-gold">Host</span>
                  )}
                </div>
              ))}
              {players.length === 0 && (
                <div className="text-muted text-sm">Waiting for players...</div>
              )}
            </div>
          )}
        </div>

        {isHost ? (
          <button
            className="btn btn-gold btn-full btn-lg"
            onClick={handleStartDraft}
            disabled={players.length < 2}
            title={players.length < 2 ? 'Need at least 2 players to start' : ''}
          >
            🎯 Start Draft
          </button>
        ) : (
          <div className="card text-center">
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⏳</div>
            <div className="font-semibold">Waiting for host to start...</div>
            <div className="text-sm text-muted mt-2">
              The host will begin the draft when everyone has joined.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
