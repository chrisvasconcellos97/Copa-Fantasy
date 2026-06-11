import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../lib/supabase';
import { setSession } from '../lib/session';

function generateJoinCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export default function HomeView() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('create');

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

      const { data: game, error: gameError } = await supabase
        .from('games')
        .insert({ status: 'lobby', host_token: hostToken, join_code: joinCode })
        .select()
        .single();

      if (gameError) throw gameError;

      const { data: gamePlayer, error: playerError } = await supabase
        .from('game_players')
        .insert({ game_id: game.id, player_name: createName.trim(), is_host: true })
        .select()
        .single();

      if (playerError) throw playerError;

      setSession({ playerId: gamePlayer.id, playerName: createName.trim(), hostToken });
      navigate(`/lobby/${game.id}`);
    } catch (err) {
      setCreateError(err.message || 'Failed to create game');
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
      const code = joinCode.trim().toUpperCase();
      const { data: game, error: gameError } = await supabase
        .from('games')
        .select('*')
        .eq('join_code', code)
        .single();

      if (gameError || !game) throw new Error('Game not found. Check your code.');

      if (game.status !== 'lobby') {
        throw new Error('This game has already started.');
      }

      const { data: gamePlayer, error: playerError } = await supabase
        .from('game_players')
        .insert({ game_id: game.id, player_name: joinName.trim(), is_host: false })
        .select()
        .single();

      if (playerError) throw playerError;

      setSession({ playerId: gamePlayer.id, playerName: joinName.trim(), hostToken: null });
      navigate(`/lobby/${game.id}`);
    } catch (err) {
      setJoinError(err.message || 'Failed to join game');
    } finally {
      setJoining(false);
    }
  }

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 480 }}>
        <div className="text-center mb-6">
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🏆</div>
          <h1 className="page-title" style={{ marginBottom: '0.5rem' }}>Copa Fantasy 2026</h1>
          <p className="text-muted">Draft your teams and compete with friends</p>
        </div>

        {/* Tabs */}
        <div className="tabs mb-4">
          <button
            className={`tab ${tab === 'create' ? 'active' : ''}`}
            onClick={() => setTab('create')}
          >
            Create Game
          </button>
          <button
            className={`tab ${tab === 'join' ? 'active' : ''}`}
            onClick={() => setTab('join')}
          >
            Join Game
          </button>
        </div>

        {tab === 'create' && (
          <div className="card">
            <h2 className="section-title">Create a New Game</h2>
            <p className="text-sm text-muted mb-4">
              You'll be the host. Share the join code with your friends.
            </p>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label>Your Name</label>
                <input
                  className="input"
                  type="text"
                  placeholder="Enter your name"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  maxLength={30}
                  autoFocus
                />
              </div>
              {createError && (
                <div className="text-danger text-sm mb-3">{createError}</div>
              )}
              <button
                type="submit"
                className="btn btn-gold btn-full btn-lg"
                disabled={!createName.trim() || creating}
              >
                {creating ? 'Creating...' : '🚀 Create Game'}
              </button>
            </form>
          </div>
        )}

        {tab === 'join' && (
          <div className="card">
            <h2 className="section-title">Join a Game</h2>
            <p className="text-sm text-muted mb-4">
              Enter the 6-character code from your host.
            </p>
            <form onSubmit={handleJoin}>
              <div className="form-group">
                <label>Game Code</label>
                <input
                  className="input"
                  type="text"
                  placeholder="e.g. ABC123"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  style={{ textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '1.2rem' }}
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label>Your Name</label>
                <input
                  className="input"
                  type="text"
                  placeholder="Enter your name"
                  value={joinName}
                  onChange={(e) => setJoinName(e.target.value)}
                  maxLength={30}
                />
              </div>
              {joinError && (
                <div className="text-danger text-sm mb-3">{joinError}</div>
              )}
              <button
                type="submit"
                className="btn btn-gold btn-full btn-lg"
                disabled={!joinCode.trim() || !joinName.trim() || joining}
              >
                {joining ? 'Joining...' : '🎮 Join Game'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
