import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../lib/supabase';
import { setSession } from '../lib/session';

function generateJoinCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
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
      const { data: game, error: gameErr } = await supabase
        .from('games')
        .select('*')
        .eq('join_code', joinCode.trim().toUpperCase())
        .single();

      if (gameErr || !game) {
        throw new Error('Game not found. Check your code and try again.');
      }

      if (game.status !== 'lobby') {
        throw new Error('This game has already started.');
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
      setJoinError(err.message || 'Failed to join game');
    } finally {
      setJoining(false);
    }
  }

  return (
    <div className="page">
      <div style={{ textAlign: 'center', marginBottom: 40, marginTop: 20 }}>
        <div style={{ fontSize: '3.5rem', marginBottom: 12 }}>⚽</div>
        <h1 className="page-title" style={{ marginBottom: 8 }}>Copa Fantasy 2026</h1>
        <p className="text-muted">Draft your teams and compete with friends</p>
      </div>

      <div className="grid grid-2" style={{ maxWidth: 700, margin: '0 auto', gap: 24 }}>
        {/* Create Game */}
        <div className="card">
          <div className="card-title">🏆 Create Game</div>
          <p className="text-sm text-muted mb-4">Start a new fantasy league and invite your friends</p>
          <form onSubmit={handleCreate}>
            <div className="input-group">
              <label className="input-label">Your Name</label>
              <input
                className="input"
                type="text"
                placeholder="Enter your name"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                maxLength={30}
                required
              />
            </div>
            {createError && (
              <div className="text-danger text-sm mb-2">{createError}</div>
            )}
            <button
              className="btn btn-primary btn-block"
              type="submit"
              disabled={creating || !createName.trim()}
            >
              {creating ? (
                <><span className="loading-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Creating...</>
              ) : (
                'Create Game'
              )}
            </button>
          </form>
        </div>

        {/* Join Game */}
        <div className="card">
          <div className="card-title">🔗 Join Game</div>
          <p className="text-sm text-muted mb-4">Enter an invite code to join a friend's league</p>
          <form onSubmit={handleJoin}>
            <div className="input-group">
              <label className="input-label">Invite Code</label>
              <input
                className="input"
                type="text"
                placeholder="e.g. ABC123"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                maxLength={6}
                style={{ textTransform: 'uppercase', letterSpacing: '0.2em', fontFamily: 'monospace', fontSize: '1.1rem' }}
                required
              />
            </div>
            <div className="input-group">
              <label className="input-label">Your Name</label>
              <input
                className="input"
                type="text"
                placeholder="Enter your name"
                value={joinName}
                onChange={(e) => setJoinName(e.target.value)}
                maxLength={30}
                required
              />
            </div>
            {joinError && (
              <div className="text-danger text-sm mb-2">{joinError}</div>
            )}
            <button
              className="btn btn-primary btn-block"
              type="submit"
              disabled={joining || !joinCode.trim() || !joinName.trim()}
            >
              {joining ? (
                <><span className="loading-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Joining...</>
              ) : (
                'Join Game'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
