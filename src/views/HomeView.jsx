import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getOrCreateToken, setPlayerName, setGameId } from '../lib/session';

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export default function HomeView() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('create');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleCreate(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError('');
    try {
      const token = getOrCreateToken();
      const gameCode = generateCode();
      const { data: game, error: gameErr } = await supabase
        .from('games')
        .insert({ code: gameCode, host_session_token: token, status: 'lobby', wc_season: 2026 })
        .select()
        .single();
      if (gameErr) throw gameErr;

      const { error: playerErr } = await supabase
        .from('game_players')
        .insert({ game_id: game.id, name: name.trim(), session_token: token, draft_order: 0 });
      if (playerErr) throw playerErr;

      setPlayerName(name.trim());
      setGameId(game.id);
      navigate(`/lobby/${game.id}`);
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin(e) {
    e.preventDefault();
    if (!name.trim() || !code.trim()) return;
    setLoading(true);
    setError('');
    try {
      const token = getOrCreateToken();
      const { data: game, error: gameErr } = await supabase
        .from('games')
        .select('*')
        .eq('code', code.trim().toUpperCase())
        .single();
      if (gameErr || !game) throw new Error('Game not found. Check the code and try again.');
      if (game.status !== 'lobby') throw new Error('This game has already started.');

      // Check if already joined
      const { data: existing } = await supabase
        .from('game_players')
        .select('id')
        .eq('game_id', game.id)
        .eq('session_token', token)
        .single();

      if (!existing) {
        const { data: allPlayers } = await supabase
          .from('game_players')
          .select('draft_order')
          .eq('game_id', game.id)
          .order('draft_order', { ascending: false })
          .limit(1);
        const nextOrder = allPlayers && allPlayers.length > 0 ? allPlayers[0].draft_order + 1 : 1;

        const { error: playerErr } = await supabase
          .from('game_players')
          .insert({ game_id: game.id, name: name.trim(), session_token: token, draft_order: nextOrder });
        if (playerErr) throw playerErr;
      }

      setPlayerName(name.trim());
      setGameId(game.id);
      navigate(`/lobby/${game.id}`);
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="view">
      <div className="hero-banner">
        <h1>⚽ Copa Fantasy</h1>
        <p className="muted" style={{ marginTop: 6 }}>World Cup 2026 Draft Game</p>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button
          className={`btn ${tab === 'create' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ flex: 1 }}
          onClick={() => setTab('create')}
        >
          Create Game
        </button>
        <button
          className={`btn ${tab === 'join' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ flex: 1 }}
          onClick={() => setTab('join')}
        >
          Join Game
        </button>
      </div>

      {tab === 'create' && (
        <div className="card">
          <h2 style={{ marginBottom: 16 }}>Create a New Game</h2>
          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="input-group">
              <label>Your Name</label>
              <input
                className="input"
                placeholder="e.g. Alex"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={32}
                required
              />
            </div>
            {error && <div className="danger text-sm">{error}</div>}
            <button className="btn btn-primary btn-full btn-lg" type="submit" disabled={loading}>
              {loading ? 'Creating...' : '🎉 Create Game'}
            </button>
          </form>
        </div>
      )}

      {tab === 'join' && (
        <div className="card">
          <h2 style={{ marginBottom: 16 }}>Join a Game</h2>
          <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="input-group">
              <label>Your Name</label>
              <input
                className="input"
                placeholder="e.g. Sam"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={32}
                required
              />
            </div>
            <div className="input-group">
              <label>Game Code</label>
              <input
                className="input"
                placeholder="e.g. AB3X7Y"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                maxLength={6}
                required
                style={{ letterSpacing: 4, textTransform: 'uppercase', fontSize: '1.2rem', fontWeight: 700 }}
              />
            </div>
            {error && <div className="danger text-sm">{error}</div>}
            <button className="btn btn-primary btn-full btn-lg" type="submit" disabled={loading}>
              {loading ? 'Joining...' : '🚀 Join Game'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
