import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getOrCreateToken, setPlayerName, setGameId } from '../lib/session';

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export default function HomeView() {
  const navigate = useNavigate();

  const [createName, setCreateName] = useState('');
  const [joinName, setJoinName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [createError, setCreateError] = useState('');
  const [joinError, setJoinError] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);

  async function handleCreate(e) {
    e.preventDefault();
    if (!createName.trim()) { setCreateError('Please enter your name.'); return; }
    setCreateError('');
    setCreateLoading(true);

    try {
      const token = getOrCreateToken();
      const code = generateCode();

      const { data: game, error: gameErr } = await supabase
        .from('games')
        .insert({ code, status: 'lobby', host_token: token })
        .select()
        .single();

      if (gameErr) throw gameErr;

      const { data: gp, error: gpErr } = await supabase
        .from('game_players')
        .insert({
          game_id: game.id,
          player_token: token,
          name: createName.trim(),
          is_host: true,
        })
        .select()
        .single();

      if (gpErr) throw gpErr;

      setPlayerName(createName.trim());
      setGameId(game.id);
      navigate(`/lobby/${game.id}`);
    } catch (err) {
      setCreateError(err.message || 'Failed to create game.');
    } finally {
      setCreateLoading(false);
    }
  }

  async function handleJoin(e) {
    e.preventDefault();
    if (!joinName.trim()) { setJoinError('Please enter your name.'); return; }
    if (!joinCode.trim()) { setJoinError('Please enter a game code.'); return; }
    setJoinError('');
    setJoinLoading(true);

    try {
      const token = getOrCreateToken();
      const upperCode = joinCode.trim().toUpperCase();

      const { data: game, error: gameErr } = await supabase
        .from('games')
        .select('*')
        .eq('code', upperCode)
        .single();

      if (gameErr || !game) throw new Error('Game not found. Check the code and try again.');
      if (game.status !== 'lobby') throw new Error('This game has already started.');

      // Check if player already in this game with this token
      const { data: existing } = await supabase
        .from('game_players')
        .select('id')
        .eq('game_id', game.id)
        .eq('player_token', token)
        .single();

      if (!existing) {
        const { error: gpErr } = await supabase
          .from('game_players')
          .insert({
            game_id: game.id,
            player_token: token,
            name: joinName.trim(),
            is_host: false,
          });
        if (gpErr) throw gpErr;
      }

      setPlayerName(joinName.trim());
      setGameId(game.id);
      navigate(`/lobby/${game.id}`);
    } catch (err) {
      setJoinError(err.message || 'Failed to join game.');
    } finally {
      setJoinLoading(false);
    }
  }

  return (
    <div className="home-view">
      <div>
        <div className="home-view__logo">Copa<span>Fantasy</span> <span style={{ color: 'var(--color-text-secondary)', fontSize: '1.2rem' }}>2026</span></div>
        <p className="text-center text-sm" style={{ color: 'var(--color-text-secondary)', marginTop: '0.5rem' }}>
          Pick your World Cup squad. Outscore your friends.
        </p>
      </div>

      <div className="home-view__cards">
        {/* Create Game */}
        <div className="card">
          <h2 className="font-bold text-lg" style={{ marginBottom: '1rem', color: 'var(--color-primary)' }}>🏆 Create Game</h2>
          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <input
              className="input"
              type="text"
              placeholder="Your name"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              maxLength={30}
              autoComplete="off"
            />
            {createError && <p className="text-danger text-sm">{createError}</p>}
            <button type="submit" className="btn btn-primary w-full" disabled={createLoading}>
              {createLoading ? 'Creating…' : 'Create Game'}
            </button>
          </form>
        </div>

        {/* Join Game */}
        <div className="card">
          <h2 className="font-bold text-lg" style={{ marginBottom: '1rem', color: 'var(--color-secondary)' }}>🔗 Join Game</h2>
          <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <input
              className="input"
              type="text"
              placeholder="Your name"
              value={joinName}
              onChange={(e) => setJoinName(e.target.value)}
              maxLength={30}
              autoComplete="off"
            />
            <input
              className="input"
              type="text"
              placeholder="Game code (e.g. ABC123)"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              maxLength={8}
              autoComplete="off"
              style={{ letterSpacing: '0.15em', textTransform: 'uppercase' }}
            />
            {joinError && <p className="text-danger text-sm">{joinError}</p>}
            <button type="submit" className="btn btn-secondary w-full" disabled={joinLoading}>
              {joinLoading ? 'Joining…' : 'Join Game'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
