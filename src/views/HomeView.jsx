import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../lib/supabase.js';
import { setSession } from '../lib/session.js';

function randomJoinCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export default function HomeView() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('create');
  const [createName, setCreateName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [joinName, setJoinName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleCreate(e) {
    e.preventDefault();
    if (!createName.trim()) return;
    setLoading(true);
    setError('');
    try {
      const hostToken = uuidv4();
      const joinCode = randomJoinCode();

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
      setError(err.message || 'Failed to create game. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin(e) {
    e.preventDefault();
    if (!joinCode.trim() || !joinName.trim()) return;
    setLoading(true);
    setError('');
    try {
      const { data: game, error: gameErr } = await supabase
        .from('games')
        .select('*')
        .eq('join_code', joinCode.trim().toUpperCase())
        .single();

      if (gameErr || !game) throw new Error('Game not found. Check the code and try again.');
      if (game.status !== 'lobby') throw new Error('This game has already started.');

      const { data: gamePlayer, error: playerErr } = await supabase
        .from('game_players')
        .insert({ game_id: game.id, player_name: joinName.trim(), is_host: false })
        .select()
        .single();

      if (playerErr) throw playerErr;

      setSession({ playerId: gamePlayer.id, playerName: joinName.trim(), hostToken: null });
      navigate(`/lobby/${game.id}`);
    } catch (err) {
      setError(err.message || 'Failed to join game. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 480, marginTop: 40 }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h1 style={{ fontSize: '2.8rem', marginBottom: 8 }}>
            <span style={{ color: 'var(--gold)' }}>Copa</span> Fantasy
          </h1>
          <p className="text-muted">World Cup 2026 Draft Fantasy League</p>
        </div>

        <div className="tab-list" style={{ marginBottom: 24 }}>
          <button className={`tab${tab === 'create' ? ' active' : ''}`} onClick={() => { setTab('create'); setError(''); }}>
            Create Game
          </button>
          <button className={`tab${tab === 'join' ? ' active' : ''}`} onClick={() => { setTab('join'); setError(''); }}>
            Join Game
          </button>
        </div>

        {tab === 'create' && (
          <div className="card fade-in-up">
            <h2 style={{ marginBottom: 20 }}>Create a New Game</h2>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Your Name</label>
                <input
                  className="input"
                  type="text"
                  placeholder="Enter your name"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  required
                  maxLength={30}
                  autoFocus
                />
              </div>
              {error && <div style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>{error}</div>}
              <button className="btn btn-gold btn-lg w-full" type="submit" disabled={loading || !createName.trim()}>
                {loading ? 'Creating...' : '🚀 Create Game'}
              </button>
            </form>
          </div>
        )}

        {tab === 'join' && (
          <div className="card fade-in-up">
            <h2 style={{ marginBottom: 20 }}>Join a Game</h2>
            <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Game Code</label>
                <input
                  className="input"
                  type="text"
                  placeholder="Enter 6-character code"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  required
                  maxLength={6}
                  style={{ textTransform: 'uppercase', letterSpacing: '0.2em', fontSize: '1.2rem' }}
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label className="form-label">Your Name</label>
                <input
                  className="input"
                  type="text"
                  placeholder="Enter your name"
                  value={joinName}
                  onChange={(e) => setJoinName(e.target.value)}
                  required
                  maxLength={30}
                />
              </div>
              {error && <div style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>{error}</div>}
              <button className="btn btn-gold btn-lg w-full" type="submit" disabled={loading || !joinCode.trim() || !joinName.trim()}>
                {loading ? 'Joining...' : '✅ Join Game'}
              </button>
            </form>
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: 32, color: 'var(--text-muted)', fontSize: '0.8rem' }}>
          <p>8 teams per player · Snake draft · 48 teams total</p>
        </div>
      </div>
    </div>
  );
}
