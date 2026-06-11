import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getOrCreateToken, setPlayerName, getPlayerName, setGameId } from '../lib/session';

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export default function HomeView() {
  const navigate = useNavigate();
  const [name, setName] = useState(getPlayerName());
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('create'); // 'create' | 'join'

  const token = getOrCreateToken();

  async function handleCreate() {
    if (!name.trim()) { setError('Enter your name first'); return; }
    setError('');
    setLoading(true);
    try {
      setPlayerName(name.trim());
      const code = generateCode();

      const { data: game, error: gameErr } = await supabase
        .from('games')
        .insert({ code, status: 'lobby', host_token: token })
        .select()
        .single();

      if (gameErr) throw gameErr;

      const { error: playerErr } = await supabase
        .from('game_players')
        .insert({
          game_id: game.id,
          player_token: token,
          name: name.trim(),
          is_host: true,
        });

      if (playerErr) throw playerErr;

      setGameId(game.id);
      navigate(`/lobby/${game.id}`);
    } catch (e) {
      setError(e.message || 'Failed to create game');
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin() {
    if (!name.trim()) { setError('Enter your name first'); return; }
    if (!joinCode.trim()) { setError('Enter a game code'); return; }
    setError('');
    setLoading(true);
    try {
      setPlayerName(name.trim());
      const { data: game, error: gameErr } = await supabase
        .from('games')
        .select('*')
        .eq('code', joinCode.trim().toUpperCase())
        .single();

      if (gameErr || !game) throw new Error('Game not found');
      if (game.status !== 'lobby') throw new Error('Game already started');

      // Check if already in game
      const { data: existing } = await supabase
        .from('game_players')
        .select('id')
        .eq('game_id', game.id)
        .eq('player_token', token)
        .maybeSingle();

      if (!existing) {
        const { error: playerErr } = await supabase
          .from('game_players')
          .insert({
            game_id: game.id,
            player_token: token,
            name: name.trim(),
            is_host: false,
          });
        if (playerErr) throw playerErr;
      }

      setGameId(game.id);
      navigate(`/lobby/${game.id}`);
    } catch (e) {
      setError(e.message || 'Failed to join game');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-center">
      <div style={{ width: '100%', maxWidth: 440 }}>
        <div className="text-center mb-6">
          <h1 style={{ color: 'var(--gold-soft)', fontSize: 36 }}>⚽ Copa Fantasy</h1>
          <p className="text-muted mt-2">World Cup 2026 Fantasy Draft</p>
        </div>

        <div className="card">
          <div className="flex mb-4" style={{ gap: 0 }}>
            {['create', 'join'].map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: tab === t ? 'var(--gold)' : 'var(--navy-3)',
                  color: tab === t ? 'var(--navy)' : 'var(--muted)',
                  border: 'none',
                  fontFamily: 'inherit',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                  borderRadius: t === 'create' ? 'var(--radius-sm) 0 0 var(--radius-sm)' : '0 var(--radius-sm) var(--radius-sm) 0',
                  transition: 'all 0.18s',
                }}
              >
                {t === 'create' ? '+ Create Game' : '→ Join Game'}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-3">
            <div className="form-group">
              <label className="form-label">Your Name</label>
              <input
                className="input"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (tab === 'create' ? handleCreate() : handleJoin())}
                maxLength={30}
              />
            </div>

            {tab === 'join' && (
              <div className="form-group">
                <label className="form-label">Game Code</label>
                <input
                  className="input"
                  placeholder="e.g. ABC123"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                  maxLength={6}
                  style={{ textTransform: 'uppercase', letterSpacing: '0.15em', fontSize: 20, fontWeight: 700 }}
                />
              </div>
            )}

            {error && (
              <div style={{
                background: 'rgba(217,83,79,0.15)',
                border: '1px solid var(--danger)',
                borderRadius: 'var(--radius-sm)',
                padding: '10px 14px',
                color: '#e87474',
                fontSize: 13,
              }}>
                {error}
              </div>
            )}

            <button
              className="btn btn-primary btn-lg btn-full"
              onClick={tab === 'create' ? handleCreate : handleJoin}
              disabled={loading}
            >
              {loading ? (
                <><span className="spinner spinner-sm" /> {tab === 'create' ? 'Creating...' : 'Joining...'}</>
              ) : (
                tab === 'create' ? 'Create Game' : 'Join Game'
              )}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-muted mt-4">
          Copa Fantasy 2026 · Draft your World Cup squad
        </p>
      </div>
    </div>
  );
}
