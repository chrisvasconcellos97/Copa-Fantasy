import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGame } from '../hooks/useGame';
import { usePlayers } from '../hooks/usePlayers';
import { supabase } from '../lib/supabase';
import { getOrCreateToken } from '../lib/session';
import CopyCode from '../components/CopyCode';
import PokeToast from '../components/PokeToast';
import { useNotifications } from '../hooks/useNotifications';

export default function LobbyView() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const { game, loading: gameLoading } = useGame(gameId);
  const { players, loading: playersLoading } = usePlayers(gameId);
  const token = getOrCreateToken();
  const me = players.find((p) => p.session_token === token);
  const isHost = game?.host_session_token === token;
  const { unread, dismiss } = useNotifications(me?.id);
  const [starting, setStarting] = React.useState(false);
  const [error, setError] = React.useState('');

  useEffect(() => {
    if (game && game.status !== 'lobby') {
      navigate(`/draft/${gameId}`);
    }
  }, [game, gameId, navigate]);

  async function handleStartDraft() {
    if (players.length < 2) return;
    setStarting(true);
    setError('');
    try {
      // Assign draft orders randomly
      const shuffled = [...players].sort(() => Math.random() - 0.5);
      for (let i = 0; i < shuffled.length; i++) {
        await supabase
          .from('game_players')
          .update({ draft_order: i })
          .eq('id', shuffled[i].id);
      }

      const totalPicks = shuffled.length * 8; // 4 pots × 2 picks each
      const { error: err } = await supabase
        .from('games')
        .update({
          status: 'drafting_teams',
          current_pick_number: 0,
          total_picks: totalPicks,
        })
        .eq('id', gameId);
      if (err) throw err;
    } catch (err) {
      setError(err.message);
      setStarting(false);
    }
  }

  if (gameLoading || playersLoading) {
    return <div className="view"><div className="spinner" /></div>;
  }

  return (
    <div className="view">
      {unread[0] && <PokeToast message={unread[0].message} onDismiss={() => dismiss(unread[0].id)} />}

      <div style={{ marginBottom: 24 }}>
        <h1>Game Lobby</h1>
        <p className="muted" style={{ marginTop: 4 }}>Share the code with your friends</p>
      </div>

      {game?.code && <CopyCode code={game.code} />}

      <div style={{ marginTop: 24 }}>
        <div className="section-title">{players.length} Player{players.length !== 1 ? 's' : ''} Joined</div>
        {players.map((p) => (
          <div key={p.id} className="card" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="status-dot" />
            <span style={{ fontWeight: 700 }}>{p.name}</span>
            {game?.host_session_token === p.session_token && (
              <span className="badge" style={{ background: 'var(--gold-dim)', color: 'var(--gold-soft)', marginLeft: 'auto' }}>Host</span>
            )}
            {p.session_token === token && (
              <span className="muted text-xs" style={{ marginLeft: 'auto' }}>(you)</span>
            )}
          </div>
        ))}

        {players.length === 0 && (
          <div className="empty-state">
            <div className="empty-state__icon">👥</div>
            <div>Waiting for players...</div>
          </div>
        )}
      </div>

      <div style={{ marginTop: 24 }}>
        {isHost ? (
          <>
            {error && <div className="danger text-sm" style={{ marginBottom: 8 }}>{error}</div>}
            <button
              className="btn btn-primary btn-full btn-lg"
              onClick={handleStartDraft}
              disabled={players.length < 2 || starting}
            >
              {starting ? 'Starting...' : players.length < 2 ? 'Need 2+ players to start' : '🏁 Start Draft'}
            </button>
          </>
        ) : (
          <div className="card text-center">
            <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>⏳</div>
            <div className="muted">Waiting for the host to start the draft...</div>
          </div>
        )}
      </div>
    </div>
  );
}
