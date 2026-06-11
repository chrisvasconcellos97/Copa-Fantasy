import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { setSession } from '../lib/session';
import { v4 as uuidv4 } from 'uuid';

function generateJoinCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export default function HomeView() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('create');

  // Create
  const [createName, setCreateName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // Join
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

      setSession({ playerId: gamePlayer.id, playerName: createName.trim(), hostToken, gameId: game.id });
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
      const { data: games, error: gameError } = await supabase
        .from('games')
        .select('*')
        .eq('join_code', joinCode.trim().toUpperCase())
        .limit(1);
      if (gameError) throw gameError;
      if (!games || games.length === 0) throw new Error('Game not found. Check the code and try again.');
      const game = games[0];
      if (game.status !== 'lobby') throw new Error('This game has already started.');

      const { data: gamePlayer, error: playerError } = await supabase
        .from('game_players')
        .insert({ game_id: game.id, player_name: joinName.trim(), is_host: false })
        .select()
        .single();
      if (playerError) throw playerError;

      setSession({ playerId: gamePlayer.id, playerName: joinName.trim(), hostToken: null, gameId: game.id });
      navigate(`/lobby/${game.id}`);
    } catch (err) {
      setJoinError(err.message || 'Failed to join game');
    } finally {
      setJoining(false);
    }
  }

  return (
    <div className="page-center">
      <div style={{ width: '100%', maxWidth: '440px' }}>
        {/* Header */}
        <div className="text-center" style={{ marginBottom: '32px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '8px' }}>🏆</div>
          <h1 style={{ color: 'var(--gold)', marginBottom: '8px' }}>Copa Fantasy 2026</h1>
          <p className="text-muted">Draft your World Cup teams & players with friends</p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          <button
            className={`tab w-full ${tab === 'create' ? 'tab--active' : ''}`}
            onClick={() => setTab('create')}
          >
            Create Game
          </button>
          <button
            className={`tab w-full ${tab === 'join' ? 'tab--active' : ''}`}
            onClick={() => setTab('join')}
          >
            Join Game
          </button>
        </div>

        {/* Create */}
        {tab === 'create' && (
          <div className="card">
            <h2 style={{ marginBottom: '4px' }}>Create a New Game</h2>
            <p className="text-muted text-sm" style={{ marginBottom: '20px' }}>
              You&apos;ll be the host. Share the code with friends.
            </p>
            <form onSubmit={handleCreate}>
              <div className="input-group" style={{ marginBottom: '16px' }}>
                <label className="input-label">Your Name</label>
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
                <p className="text-danger text-sm" style={{ marginBottom: '12px' }}>{createError}</p>
              )}
              <button
                type="submit"
                className="btn btn-primary w-full"
                disabled={creating || !createName.trim()}
              >
                {creating ? 'Creating...' : 'Create Game 🚀'}
              </button>
            </form>
          </div>
        )}

        {/* Join */}
        {tab === 'join' && (
          <div className="card">
            <h2 style={{ marginBottom: '4px' }}>Join a Game</h2>
            <p className="text-muted text-sm" style={{ marginBottom: '20px' }}>
              Enter the 6-character code from your host.
            </p>
            <form onSubmit={handleJoin}>
              <div className="input-group" style={{ marginBottom: '12px' }}>
                <label className="input-label">Game Code</label>
                <input
                  className="input"
                  type="text"
                  placeholder="e.g. ABC123"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  style={{ textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '1.25rem' }}
                  autoFocus
                />
              </div>
              <div className="input-group" style={{ marginBottom: '16px' }}>
                <label className="input-label">Your Name</label>
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
                <p className="text-danger text-sm" style={{ marginBottom: '12px' }}>{joinError}</p>
              )}
              <button
                type="submit"
                className="btn btn-primary w-full"
                disabled={joining || !joinCode.trim() || !joinName.trim()}
              >
                {joining ? 'Joining...' : 'Join Game →'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
