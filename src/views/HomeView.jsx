import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { setSession } from '../lib/session';
import { v4 as uuidv4 } from 'uuid';

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
  const [tab, setTab] = useState('create'); // 'create' | 'join'

  // Create state
  const [createName, setCreateName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // Join state
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
      const { data: games, error: gameErr } = await supabase
        .from('games')
        .select('*')
        .eq('join_code', joinCode.trim().toUpperCase())
        .limit(1);

      if (gameErr) throw gameErr;
      if (!games || games.length === 0) throw new Error('Game not found. Check your code.');

      const game = games[0];

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
      <div className="page-header text-center">
        <h1 className="page-title" style={{ fontSize: '2.8rem' }}>⚽ Copa Fantasy 2026</h1>
        <p className="page-subtitle">Draft your World Cup squad and compete with friends</p>
      </div>

      <div style={{ maxWidth: 460, margin: '0 auto' }}>
        <div className="row mb-24" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
          {['create', 'join'].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                background: 'none',
                border: 'none',
                borderBottom: tab === t ? '2px solid var(--gold)' : '2px solid transparent',
                color: tab === t ? 'var(--gold)' : 'var(--text-muted)',
                fontWeight: 700,
                fontSize: '1rem',
                padding: '10px 20px',
                cursor: 'pointer',
                marginBottom: -1,
              }}
            >
              {t === 'create' ? '🎮 Create Game' : '🔗 Join Game'}
            </button>
          ))}
        </div>

        {tab === 'create' ? (
          <div className="card fade-in">
            <div className="card-title">Create a New Game</div>
            <p className="text-muted text-sm mb-16">
              You&apos;ll be the host. Share the join code with friends.
            </p>
            <form onSubmit={handleCreate} className="col gap-16">
              <div className="form-group">
                <label className="form-label">Your Name</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Enter your name..."
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  maxLength={30}
                  autoFocus
                />
              </div>
              {createError && <p className="text-danger text-sm">{createError}</p>}
              <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={creating || !createName.trim()}>
                {creating ? (
                  <><span className="spinner" style={{ width: 18, height: 18 }} /> Creating...</>
                ) : (
                  '🚀 Create Game'
                )}
              </button>
            </form>
          </div>
        ) : (
          <div className="card fade-in">
            <div className="card-title">Join a Game</div>
            <p className="text-muted text-sm mb-16">
              Enter the 6-character code from your host.
            </p>
            <form onSubmit={handleJoin} className="col gap-16">
              <div className="form-group">
                <label className="form-label">Join Code</label>
                <input
                  type="text"
                  className="input input-lg"
                  placeholder="ABC123"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label className="form-label">Your Name</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Enter your name..."
                  value={joinName}
                  onChange={(e) => setJoinName(e.target.value)}
                  maxLength={30}
                />
              </div>
              {joinError && <p className="text-danger text-sm">{joinError}</p>}
              <button
                type="submit"
                className="btn btn-primary btn-full btn-lg"
                disabled={joining || !joinCode.trim() || !joinName.trim()}
              >
                {joining ? (
                  <><span className="spinner" style={{ width: 18, height: 18 }} /> Joining...</>
                ) : (
                  '🎯 Join Game'
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
