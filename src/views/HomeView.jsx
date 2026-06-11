import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../lib/supabase.js';
import { setSession } from '../lib/session.js';

function generateJoinCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export default function HomeView() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('create');

  // Create form
  const [createName, setCreateName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // Join form
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
      const { data: game, error: gameError } = await supabase
        .from('games')
        .select('*')
        .eq('join_code', joinCode.trim().toUpperCase())
        .single();

      if (gameError || !game) throw new Error('Game not found. Check your code.');

      if (game.status !== 'lobby') throw new Error('This game has already started.');

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
    <div className="page" style={{ maxWidth: 480, paddingTop: 48 }}>
      <h1 className="page-title">Copa Fantasy 2026</h1>
      <p className="page-subtitle">Draft your World Cup teams and compete with friends</p>

      <div className="tabs">
        <button className={`tab${tab === 'create' ? ' tab--active' : ''}`} onClick={() => setTab('create')}>
          Create Game
        </button>
        <button className={`tab${tab === 'join' ? ' tab--active' : ''}`} onClick={() => setTab('join')}>
          Join Game
        </button>
      </div>

      {tab === 'create' && (
        <form onSubmit={handleCreate} className="card fade-in">
          <div className="form-group">
            <label className="label" htmlFor="create-name">Your Name</label>
            <input
              id="create-name"
              className="input"
              type="text"
              placeholder="Enter your name"
              value={createName}
              onChange={e => setCreateName(e.target.value)}
              maxLength={30}
              required
            />
          </div>
          {createError && (
            <p style={{ color: 'var(--danger)', fontSize: '0.85rem', marginBottom: 12 }}>{createError}</p>
          )}
          <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={creating || !createName.trim()}>
            {creating ? 'Creating...' : '🚀 Create Game'}
          </button>
          <p style={{ marginTop: 12, fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
            You'll receive a code to share with friends
          </p>
        </form>
      )}

      {tab === 'join' && (
        <form onSubmit={handleJoin} className="card fade-in">
          <div className="form-group">
            <label className="label" htmlFor="join-code">Game Code</label>
            <input
              id="join-code"
              className="input"
              type="text"
              placeholder="XXXXXX"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              maxLength={6}
              style={{ letterSpacing: '0.2em', fontFamily: 'monospace', fontSize: '1.2rem' }}
              required
            />
          </div>
          <div className="form-group">
            <label className="label" htmlFor="join-name">Your Name</label>
            <input
              id="join-name"
              className="input"
              type="text"
              placeholder="Enter your name"
              value={joinName}
              onChange={e => setJoinName(e.target.value)}
              maxLength={30}
              required
            />
          </div>
          {joinError && (
            <p style={{ color: 'var(--danger)', fontSize: '0.85rem', marginBottom: 12 }}>{joinError}</p>
          )}
          <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={joining || !joinCode.trim() || !joinName.trim()}>
            {joining ? 'Joining...' : '✨ Join Game'}
          </button>
        </form>
      )}
    </div>
  );
}
