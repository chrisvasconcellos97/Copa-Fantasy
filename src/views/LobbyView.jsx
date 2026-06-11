import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';
import { getSession } from '../lib/session.js';
import { useGame } from '../hooks/useGame.js';
import { usePlayers } from '../hooks/usePlayers.js';
import CopyCode from '../components/CopyCode.jsx';

export default function LobbyView() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const { game, loading: gameLoading } = useGame(gameId);
  const { players, loading: playersLoading } = usePlayers(gameId);
  const session = getSession();

  useEffect(() => {
    if (game?.status === 'drafting_teams') {
      navigate(`/draft/${gameId}`);
    }
  }, [game?.status, gameId, navigate]);

  const handleStartDraft = async () => {
    await supabase.from('games').update({ status: 'drafting_teams' }).eq('id', gameId);
  };

  if (gameLoading) return <div className="text-center p-4 text-muted">Loading lobby...</div>;
  if (!game) return <div className="text-center p-4 text-muted">Game not found.</div>;

  const isHost = session?.hostToken && session.hostToken === game.host_token;

  return (
    <div className="lobby-view" style={{ maxWidth: '500px', margin: '0 auto', padding: '2rem 1rem' }}>
      <h1 className="text-gold text-center mb-3">Game Lobby</h1>
      <div className="card p-4 text-center mb-4">
        <CopyCode code={game.join_code} />
      </div>
      <div className="card p-3 mb-4">
        <h2 className="mb-2">Players ({players.length})</h2>
        {playersLoading ? (
          <div className="text-muted text-sm">Loading players...</div>
        ) : (
          <div className="flex flex-col gap-1">
            {players.map(player => (
              <div key={player.id} className="flex gap-2" style={{ alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                <span className="font-bold">{player.player_name}</span>
                {player.is_host && <span className="text-gold text-sm">(Host)</span>}
                {player.id === session?.playerId && <span className="text-muted text-sm">(You)</span>}
              </div>
            ))}
            {players.length === 0 && <div className="text-muted text-sm">No players yet...</div>}
          </div>
        )}
      </div>
      {isHost ? (
        <div className="text-center">
          <button className="btn btn-primary" style={{ fontSize: '1.1rem', padding: '12px 32px' }}
            onClick={handleStartDraft} disabled={players.length < 1}>
            Start Draft
          </button>
          {players.length < 2 && (
            <div className="text-muted text-sm mt-2">Waiting for at least 2 players...</div>
          )}
        </div>
      ) : (
        <div className="text-center text-muted p-3">
          <div className="text-lg mb-2">⏳</div>
          Waiting for host to start the draft...
        </div>
      )}
    </div>
  );
}
