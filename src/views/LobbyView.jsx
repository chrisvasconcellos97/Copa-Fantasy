import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useGame } from '../hooks/useGame';
import { usePlayers } from '../hooks/usePlayers';
import { getOrCreateToken } from '../lib/session';
import CopyCode from '../components/CopyCode';

export default function LobbyView() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const { game, loading: gameLoading } = useGame(gameId);
  const { players, loading: playersLoading } = usePlayers(gameId);
  const myToken = getOrCreateToken();

  const isHost = game && game.host_session_token === myToken;

  useEffect(() => {
    if (game && game.status !== 'lobby') {
      navigate('/draft/' + gameId, { replace: true });
    }
  }, [game, gameId, navigate]);

  async function handleStartDraft() {
    if (!game || players.length < 2) return;

    const shuffled = [...players].sort(() => Math.random() - 0.5);
    const totalPicks = shuffled.length * 8;

    for (let i = 0; i < shuffled.length; i++) {
      await supabase
        .from('game_players')
        .update({ draft_order: i })
        .eq('id', shuffled[i].id);
    }

    await supabase
      .from('games')
      .update({
        status: 'drafting_teams',
        total_picks: totalPicks,
        current_pick_number: 0,
      })
      .eq('id', gameId);
  }

  if (gameLoading) return <div className="page"><div className="spinner" /></div>;

  return (
    <div className="page">
      <div className="page-header">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/')}>Back</button>
        <div className="page-title">Lobby</div>
        <span className="status-chip status-chip--lobby">Waiting</span>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
        <CopyCode code={game ? game.code : '...'} />
        <div style={{ marginTop: '0.75rem', color: 'var(--muted)', fontSize: '0.82rem' }}>
          Share this code with friends to join your game
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="section-title">Players ({players.length})</div>
        {playersLoading ? (
          <div style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Loading...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {players.map((p) => {
              const isMe = p.session_token === myToken;
              const isHostPlayer = game && game.host_session_token === p.session_token;
              return (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 0.75rem', background: 'var(--navy-3)', borderRadius: 'var(--radius-sm)', border: isMe ? '1px solid var(--success)' : '1px solid var(--line)' }}>
                  <span style={{ fontSize: '1rem' }}>{isHostPlayer ? 'H' : 'P'}</span>
                  <span style={{ fontWeight: 600, flex: 1 }}>{p.name}</span>
                  {isMe && <span className="badge badge-success">You</span>}
                  {isHostPlayer && <span className="badge badge-gold">Host</span>}
                </div>
              );
            })}
            {players.length === 0 && (
              <div style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>No players yet...</div>
            )}
          </div>
        )}
      </div>

      {isHost && (
        <div className="card">
          <div style={{ color: 'var(--muted)', fontSize: '0.82rem', marginBottom: '1rem' }}>
            {players.length < 2
              ? 'Waiting for at least 2 players to join before starting.'
              : players.length + ' players ready. You can start the draft!'}
          </div>
          <button
            className="btn btn-gold btn-full btn-lg"
            onClick={handleStartDraft}
            disabled={players.length < 2}
          >
            Start Draft
          </button>
        </div>
      )}

      {!isHost && (
        <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '0.88rem', marginTop: '1rem' }}>
          Waiting for the host to start the draft...
        </div>
      )}
    </div>
  );
}
