import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getOrCreateToken, setPlayerName, setGameId } from '../lib/session';

export default function HomeView() {
  const navigate = useNavigate();
  const [createName, setCreateName] = useState('');
  const [joinName, setJoinName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);
  const [error, setError] = useState('');

  function generateCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!createName.trim()) return;
    setError('');
    setCreateLoading(true);
    try {
      const token = getOrCreateToken();
      const code = generateCode();

      const { data: game, error: gameErr } = await supabase
        .from('games')
        .insert({
          code,
          host_session_token: token,
          status: 'lobby',
          current_pick_number: 0,
          total_picks: 0,
          wc_season: 2026,
        })
        .select()
        .single();

      if (gameErr) throw gameErr;

      const { error: playerErr } = await supabase
        .from('game_players')
        .insert({
          game_id: game.id,
          name: createName.trim(),
          session_token: token,
          draft_order: 0,
        });

      if (playerErr) throw playerErr;

      setPlayerName(createName.trim());
      setGameId(game.id);
      navigate(`/lobby/${game.id}`);
    } catch (err) {
      setError(err.message || 'Failed to create game');
    } finally {
      setCreateLoading(false);
    }
  }

  async function handleJoin(e) {
    e.preventDefault();
    if (!joinName.trim() || !joinCode.trim()) return;
    setError('');
    setJoinLoading(true);
    try {
      const token = getOrCreateToken();
      const code = joinCode.trim().toUpperCase();

      const { data: game, error: gameErr } = await supabase
        .from('games')
        .select('*')
        .eq('code', code)
        .single();

      if (gameErr || !game) throw new Error('Game not found. Check the code and try again.');
      if (game.status !== 'lobby') throw new Error('This game has already started.');

      // Check if already in game
      const { data: existing } = await supabase
        .from('game_players')
        .select('id')
        .eq('game_id', game.id)
        .eq('session_token', token)
        .single();

      if (!existing) {
        const { data: players } = await supabase
          .from('game_players')
          .select('id')
          .eq('game_id', game.id);

        const order = players ? players.length : 0;

        const { error: playerErr } = await supabase
          .from('game_players')
          .insert({
            game_id: game.id,
            name: joinName.trim(),
            session_token: token,
            draft_order: order,
          });

        if (playerErr) throw playerErr;
      }

      setPlayerName(joinName.trim());
      setGameId(game.id);
      navigate(`/lobby/${game.id}`);
    } catch (err) {
      setError(err.message || 'Failed to join game');
    } finally {
      setJoinLoading(false);
    }
  }

  return (
    <div className="page">
      <div className="home-hero">
        <h1 className="home-hero__title">
          <span className="text-gold">Copa</span> Fantasy
        </h1>
        <p className="home-hero__sub">World Cup 2026 · Snake Draft · Fantasy Tournament</p>
      </div>

      {error && (
        <div style={{ maxWidth: 480, margin: '0 auto 16px', background: 'rgba(217,83,79,0.12)', border: '1px solid var(--danger)', borderRadius: 8, padding: '10px 14px', color: 'var(--danger)', fontSize: '0.85rem' }}>
          {error}
        </div>
      )}

      <div className="home-cards">
        {/* Create Game */}
        <form onSubmit={handleCreate} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: 4 }}>🏆 Create Game</h2>
          <p style={{ fontSize: '0.82rem', marginBottom: 4 }}>Start a new Copa Fantasy league as host.</p>
          <input
            className="input"
            type="text"
            placeholder="Your name"
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
            maxLength={32}
            required
          />
          <button className="btn btn-primary btn-block" type="submit" disabled={createLoading || !createName.trim()}>
            {createLoading ? 'Creating…' : 'Create Game'}
          </button>
        </form>

        {/* Join Game */}
        <form onSubmit={handleJoin} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: 4 }}>🎯 Join Game</h2>
          <p style={{ fontSize: '0.82rem', marginBottom: 4 }}>Enter the code shared by your host.</p>
          <input
            className="input"
            type="text"
            placeholder="Your name"
            value={joinName}
            onChange={(e) => setJoinName(e.target.value)}
            maxLength={32}
            required
          />
          <input
            className="input"
            type="text"
            placeholder="Game code (e.g. XK7P2)"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            maxLength={10}
            style={{ textTransform: 'uppercase', letterSpacing: 4, fontWeight: 700 }}
            required
          />
          <button className="btn btn-secondary btn-block" type="submit" disabled={joinLoading || !joinName.trim() || !joinCode.trim()}>
            {joinLoading ? 'Joining…' : 'Join Game'}
          </button>
        </form>
      </div>

      <div className="text-center mt-6" style={{ color: 'var(--muted)', fontSize: '0.78rem' }}>
        <p>8 teams per player · Snake draft · 24 players total</p>
        <p style={{ marginTop: 4 }}>1 captain · 2× all their points</p>
      </div>
    </div>
  );
}
