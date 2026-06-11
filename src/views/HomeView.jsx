import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getOrCreateToken, setPlayerName, setGameId } from '../lib/session';

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export default function HomeView() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('create'); // 'create' | 'join'
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleCreate(e) {
    e.preventDefault();
    if (!name.trim()) { setError('Enter your name'); return; }
    setLoading(true);
    setError('');
    const token = getOrCreateToken();
    const gameCode = generateCode();

    // Create game
    const { data: game, error: gameErr } = await supabase
      .from('games')
      .insert({
        code: gameCode,
        host_session_token: token,
        status: 'lobby',
        wc_season: 2026,
        current_pick_number: 0,
        total_picks: 0,
      })
      .select()
      .single();

    if (gameErr) { setError(gameErr.message); setLoading(false); return; }

    // Join as player
    const { error: playerErr } = await supabase
      .from('game_players')
      .insert({
        game_id: game.id,
        name: name.trim(),
        session_token: token,
        draft_order: 0,
      });

    if (playerErr) { setError(playerErr.message); setLoading(false); return; }

    setPlayerName(name.trim());
    setGameId(game.id);
    navigate(`/lobby/${game.id}`);
  }

  async function handleJoin(e) {
    e.preventDefault();
    if (!name.trim()) { setError('Enter your name'); return; }
    if (!code.trim()) { setError('Enter a game code'); return; }
    setLoading(true);
    setError('');
    const token = getOrCreateToken();

    // Find game
    const { data: game, error: findErr } = await supabase
      .from('games')
      .select('*')
      .eq('code', code.trim().toUpperCase())
      .single();

    if (findErr || !game) { setError('Game not found. Check the code.'); setLoading(false); return; }
    if (game.status !== 'lobby') { setError('This game has already started.'); setLoading(false); return; }

    // Check if already in game by token
    const { data: existing } = await supabase
      .from('game_players')
      .select('id')
      .eq('game_id', game.id)
      .eq('session_token', token)
      .single();

    if (!existing) {
      // Count players for draft_order
      const { count } = await supabase
        .from('game_players')
        .select('id', { count: 'exact', head: true })
        .eq('game_id', game.id);

      const { error: joinErr } = await supabase
        .from('game_players')
        .insert({
          game_id: game.id,
          name: name.trim(),
          session_token: token,
          draft_order: count || 0,
        });

      if (joinErr) { setError(joinErr.message); setLoading(false); return; }
    }

    setPlayerName(name.trim());
    setGameId(game.id);
    navigate(`/lobby/${game.id}`);
  }

  return (
    <div className="page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '2rem' }}>
      <div className="hero">
        <div className="hero__logo">🏆</div>
        <div className="hero__title">Copa Fantasy 2026</div>
        <div className="hero__sub">Draft. Play. Win.</div>
      </div>

      <div className="card" style={{ width: '100%', maxWidth: 420, marginTop: '1.5rem' }}>
        <div className="tab-row" style={{ marginBottom: '1.25rem' }}>
          <button
            className={`tab-btn ${tab === 'create' ? 'tab-btn--active' : ''}`}
            onClick={() => { setTab('create'); setError(''); }}
          >
            Create Game
          </button>
          <button
            className={`tab-btn ${tab === 'join' ? 'tab-btn--active' : ''}`}
            onClick={() => { setTab('join'); setError(''); }}
          >
            Join Game
          </button>
        </div>

        {error && (
          <div style={{ background: 'rgba(217,83,79,0.15)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-sm)', padding: '0.6rem 0.9rem', color: 'var(--danger)', fontSize: '0.85rem', marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={tab === 'create' ? handleCreate : handleJoin}>
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="label">Your Name</label>
            <input
              className="input"
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={30}
              autoFocus
            />
          </div>

          {tab === 'join' && (
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="label">Game Code</label>
              <input
                className="input"
                type="text"
                placeholder="e.g. ABC123"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                maxLength={6}
                style={{ letterSpacing: '0.2em', fontWeight: 700, fontSize: '1.1rem' }}
              />
            </div>
          )}

          <button
            className="btn btn-gold btn-full btn-lg"
            type="submit"
            disabled={loading}
          >
            {loading ? '…' : tab === 'create' ? '🎮 Create Game' : '🚀 Join Game'}
          </button>
        </form>
      </div>

      <div style={{ marginTop: '2rem', textAlign: 'center' }}>
        <a href="/matches" style={{ color: 'var(--muted)', fontSize: '0.85rem', textDecoration: 'underline' }}>
          📺 Match Centre
        </a>
      </div>
    </div>
  );
}
