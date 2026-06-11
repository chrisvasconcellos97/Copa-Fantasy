import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGame } from '../hooks/useGame.js';
import { usePlayers } from '../hooks/usePlayers.js';
import { getSession } from '../lib/session.js';
import { supabase } from '../lib/supabase.js';
import CopyCode from '../components/CopyCode.jsx';

export default function LobbyView() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const { game, loading: gameLoading } = useGame(gameId);
  const { players, loading: playersLoading } = usePlayers(gameId);
  const session = getSession();
  const isHost = Boolean(session?.hostToken);

  useEffect(() => {
    if (!game) return;
    if (game.status === 'drafting_teams' || game.status === 'selecting_players' ||
        game.status === 'selecting_captain' || game.status === 'tournament' || game.status === 'complete') {
      navigate(`/draft/${gameId}`, { replace: true });
    }
  }, [game?.status, gameId, navigate]);

  async function handleStartDraft() {
    await supabase.from('games').update({ status: 'drafting_teams' }).eq('id', gameId);
  }

  if (gameLoading) {
    return (
      <div className="page">
        <div className="loading"><div className="spinner" /></div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="page">
        <div className="empty-state">
          <div className="empty-state__icon">❌</div>
          <div className="empty-state__text">Game not found</div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <h1 className="page-title">Game Lobby</h1>

      <CopyCode code={game.join_code} />

      <div className="card mt-24">
        <div className="section-header">Players ({players.length})</div>
        {playersLoading ? (
          <div className="loading"><div className="spinner" /></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {players.map(player => (
              <div key={player.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 700 }}>
                  {player.player_name[0]?.toUpperCase()}
                </div>
                <span style={{ flex: 1, fontWeight: 600 }}>{player.player_name}</span>
                {player.is_host && <span className="badge badge-gold">Host</span>}
                {player.id === session?.playerId && <span className="badge badge-muted">You</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-24" style={{ textAlign: 'center' }}>
        {isHost ? (
          <>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 16 }}>
              {players.length < 2 ? 'Waiting for at least 2 players...' : 'Ready to start the draft!'}
            </p>
            <button
              className="btn btn-primary btn-lg"
              onClick={handleStartDraft}
              disabled={players.length < 1}
            >
              🏈 Start Draft
            </button>
          </>
        ) : (
          <div style={{ padding: 24, color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '2rem', marginBottom: 12 }}>⏳</div>
            <p>Waiting for host to start the draft...</p>
          </div>
        )}
      </div>
    </div>
  );
}
