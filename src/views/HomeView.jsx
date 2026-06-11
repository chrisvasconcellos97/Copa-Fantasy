import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../lib/supabase';
import { setSession } from '../lib/session';

function randomJoinCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
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
      const joinCode = randomJoinCode();

      // Insert game
      const { data: game, error: gameError } = await supabase
        .from('games')
        .insert({ status: 'lobby', host_token: hostToken, join_code: joinCode })
        .select()
        .single();

      if (gameError) throw gameError;

      // Insert host player
      const { data: gp, error: gpError } = await supabase
        .from('game_players')
        .insert({ game_id: game.id, player_name: createName.trim(), is_host: true })
        .select()
        .single();

      if (gpError) throw gpError;

      setSession({ playerId: gp.id, playerName: createName.trim(), hostToken });
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

      // Find game by join code
      const { data: game, error: gameError } = await supabase
        .from('games')
        .select('*')
        .eq('join_code', code)
        .single();

      if (gameError || !game) throw new Error('Game not found. Check your code and try again.');
      if (game.status !== 'lobby') throw new Error('This game has already started.');

      // Insert player
      const { data: gp, error: gpError } = await supabase
        .from('game_players')
        .insert({ game_id: game.id, player_name: joinName.trim(), is_host: false })
        .select()
        .single();

      if (gpError) throw gpError;

      setSession({ playerId: gp.id, playerName: joinName.trim(), hostToken: null });
      navigate(`/lobby/${game.id}`);
    } catch (err) {
      setJoinError(err.message || 'Failed to join game');
    } finally {
      setJoining(false);
    }
  }

  return (
    <div className="page-narrow">
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>
          <span style={{ color: 'var(--gold)' }}>Copa</span> Fantasy 2026
        </h1>
        <p className="text-muted">Draft your teams, track your players, win the tournament.</p>
      </div>

      {/* Create Game */}
      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <h2 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>🏆 Create a New Game</h2>
        <form onSubmit={handleCreate}>
          <div className="form-group">
            <label className="input-label">Your Name</label>
            <input
              className="input"
              type="text"
              placeholder="Enter your name"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              maxLength={32}
              required
            />
          </div>
          {createError && <p className="text-error text-sm" style={{ marginBottom: '0.75rem' }}>{createError}</p>}
          <button className="btn btn-primary w-full" type="submit" disabled={creating || !createName.trim()}>
            {creating ? 'Creating…' : 'Create Game'}
          </button>
        </form>
      </div>

      <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.5rem 0' }}>
        — or —
      </div>

      {/* Join Game */}
      <div className="card">
        <h2 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>🔗 Join a Game</h2>
        <form onSubmit={handleJoin}>
          <div className="form-group">
            <label className="input-label">Join Code</label>
            <input
              className="input"
              type="text"
              placeholder="e.g. ABC123"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              maxLength={6}
              style={{ letterSpacing: '0.15em', fontFamily: 'monospace', fontSize: '1.1rem' }}
              required
            />
          </div>
          <div className="form-group">
            <label className="input-label">Your Name</label>
            <input
              className="input"
              type="text"
              placeholder="Enter your name"
              value={joinName}
              onChange={(e) => setJoinName(e.target.value)}
              maxLength={32}
              required
            />
          </div>
          {joinError && <p className="text-error text-sm" style={{ marginBottom: '0.75rem' }}>{joinError}</p>}
          <button className="btn btn-primary w-full" type="submit" disabled={joining || !joinCode.trim() || !joinName.trim()}>
            {joining ? 'Joining…' : 'Join Game'}
          </button>
        </form>
      </div>
    </div>
  );
}
