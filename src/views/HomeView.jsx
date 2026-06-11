import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../lib/supabase';

function generateJoinCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function setSession(data) {
  localStorage.setItem('copa_session', JSON.stringify(data));
}

export default function HomeView() {
  const navigate = useNavigate();

  // Create game state
  const [createName, setCreateName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // Join game state
  const [joinCode, setJoinCode] = useState('');
  const [joinName, setJoinName] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState('');

  async function handleCreate(e) {
    e.preventDefault();
    if (!createName.trim()) return;
    setCreating(true);
    setCreateError('');
    try {
      const hostToken = uuidv4();
      const joinCode = generateJoinCode();

      const { data: game, error: gameErr } = await supabase
        .from('games')
        .insert({ status: 'lobby', host_token: hostToken, join_code: joinCode })
        .select()
        .single();

      if (gameErr) throw gameErr;

      const { data: gamePlayer, error: playerErr } = await supabase
        .from('game_players')
        .insert({ game_id: game.id, player_name: createName.trim(), is_host: true })
        .select()
        .single();

      if (playerErr) throw playerErr;

      setSession({ playerId: gamePlayer.id, playerName: createName.trim(), hostToken });
      navigate(`/lobby/${game.id}`);
    } catch (err) {
      setCreateError(err.message || 'Failed to create game.');
    } finally {
      setCreating(false);
    }
  }

  async function handleJoin(e) {
    e.preventDefault();
    if (!joinCode.trim() || !joinName.trim()) return;
    setJoining(true);
    setJoinError('');
    try {
      const { data: games, error: findErr } = await supabase
        .from('games')
        .select('*')
        .eq('join_code', joinCode.trim().toUpperCase())
        .limit(1);

      if (findErr) throw findErr;
      if (!games || games.length === 0) {
        setJoinError('Game not found. Check your code and try again.');
        setJoining(false);
        return;
      }

      const game = games[0];

      if (game.status !== 'lobby') {
        setJoinError('This game has already started.');
        setJoining(false);
        return;
      }

      const { data: gamePlayer, error: playerErr } = await supabase
        .from('game_players')
        .insert({ game_id: game.id, player_name: joinName.trim(), is_host: false })
        .select()
        .single();

      if (playerErr) throw playerErr;

      setSession({ playerId: gamePlayer.id, playerName: joinName.trim(), hostToken: null });
      navigate(`/lobby/${game.id}`);
    } catch (err) {
      setJoinError(err.message || 'Failed to join game.');
    } finally {
      setJoining(false);
    }
  }

  return (
    <div className="page page-narrow">
      <div style={{ textAlign: 'center', marginBottom: '2.5rem', paddingTop: '1rem' }}>
        <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>⚽</div>
        <h1 className="title">Copa Fantasy 2026</h1>
        <p className="text-muted" style={{ marginTop: '0.5rem' }}>
          Draft your teams, pick your players, win the tournament.
        </p>
      </div>

      <div className="grid-2" style={{ gap: '1.25rem' }}>
        {/* Create Game */}
        <div className="card-section">
          <h2 className="subtitle" style={{ marginBottom: '1rem' }}>🆕 Create Game</h2>
          <form onSubmit={handleCreate}>
            <div className="input-group">
              <label>Your Name</label>
              <input
                className="input"
                placeholder="Enter your name"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                maxLength={30}
                autoComplete="off"
              />
            </div>
            {createError && (
              <div style={{ color: 'var(--red)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                {createError}
              </div>
            )}
            <button
              className="btn btn-primary btn-block btn-lg"
              type="submit"
              disabled={creating || !createName.trim()}
            >
              {creating ? 'Creating...' : 'Create Game'}
            </button>
          </form>
        </div>

        {/* Join Game */}
        <div className="card-section">
          <h2 className="subtitle" style={{ marginBottom: '1rem' }}>🔗 Join Game</h2>
          <form onSubmit={handleJoin}>
            <div className="input-group">
              <label>Game Code</label>
              <input
                className="input"
                placeholder="e.g. ABC123"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                maxLength={6}
                autoComplete="off"
                style={{ textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'monospace', fontSize: '1.1rem' }}
              />
            </div>
            <div className="input-group">
              <label>Your Name</label>
              <input
                className="input"
                placeholder="Enter your name"
                value={joinName}
                onChange={(e) => setJoinName(e.target.value)}
                maxLength={30}
                autoComplete="off"
              />
            </div>
            {joinError && (
              <div style={{ color: 'var(--red)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                {joinError}
              </div>
            )}
            <button
              className="btn btn-primary btn-block btn-lg"
              type="submit"
              disabled={joining || !joinCode.trim() || !joinName.trim()}
            >
              {joining ? 'Joining...' : 'Join Game'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
