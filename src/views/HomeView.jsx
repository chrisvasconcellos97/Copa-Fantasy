import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../lib/supabase';
import { getSession, setSession } from '../lib/session';

function generateJoinCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export default function HomeView() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('create');

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

      setSession({
        playerId: gamePlayer.id,
        playerName: createName.trim(),
        hostToken,
      });

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

      if (gameErr || !game) throw new Error('Game not found. Check the code and try again.');

      if (game.status !== 'lobby') {
        throw new Error('This game has already started.');
      }

      const { data: gamePlayer, error: playerErr } = await supabase
        .from('game_players')
        .insert({ game_id: game.id, player_name: joinName.trim(), is_host: false })
        .select()
        .single();

      if (playerErr) throw playerErr;

      setSession({
        playerId: gamePlayer.id,
        playerName: joinName.trim(),
        hostToken: null,
      });

      navigate(`/lobby/${game.id}`);
    } catch (err) {
      setJoinError(err.message || 'Failed to join game');
    } finally {
      setJoining(false);
    }
  }

  return (
    <div className="page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{ fontSize: '3rem', marginBottom: 12 }}>🏆</div>
        <h1 style={{ color: 'var(--gold)', marginBottom: 8 }}>Copa Fantasy 2026</h1>
        <p style={{ color: 'var(--text-muted)' }}>Draft your teams, compete with friends</p>
      </div>

      <div style={{ width: '100%', maxWidth: 440 }}>
        <div className="tabs" style={{ marginBottom: 24 }}>
          <button className={`tab ${tab === 'create' ? 'active' : ''}`} onClick={() => setTab('create')}>
            Create Game
          </button>
          <button className={`tab ${tab === 'join' ? 'active' : ''}`} onClick={() => setTab('join')}>
            Join Game
          </button>
        </div>

        {tab === 'create' && (
          <div className="card">
            <h2 style={{ marginBottom: 20 }}>Create a New Game</h2>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="input-group">
                <label>Your Name</label>
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
                <div style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>{createError}</div>
              )}
              <button className="btn btn-primary btn-full" type="submit" disabled={creating || !createName.trim()}>
                {creating ? 'Creating...' : 'Create Game'}
              </button>
            </form>
          </div>
        )}

        {tab === 'join' && (
          <div className="card">
            <h2 style={{ marginBottom: 20 }}>Join a Game</h2>
            <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="input-group">
                <label>Game Code</label>
                <input
                  className="input"
                  type="text"
                  placeholder="Enter 6-character code"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  style={{ textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 700 }}
                  required
                />
              </div>
              <div className="input-group">
                <label>Your Name</label>
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
                <div style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>{joinError}</div>
              )}
              <button
                className="btn btn-primary btn-full"
                type="submit"
                disabled={joining || !joinCode.trim() || !joinName.trim()}
              >
                {joining ? 'Joining...' : 'Join Game'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
