import React, { useState } from 'react';
import Mascot from '../components/Mascot';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../lib/supabase';
import { setSession } from '../lib/session';

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
  const [createName, setCreateName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [joinName, setJoinName] = useState('');
  const [rejoinCode, setRejoinCode] = useState('');
  const [rejoinName, setRejoinName] = useState('');
  const [teamsPerPlayer, setTeamsPerPlayer] = useState(8);
  const [playersPerTeam, setPlayersPerTeam] = useState(3);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleCreate(e) {
    e.preventDefault();
    if (!createName.trim()) return;
    setLoading(true);
    setError('');
    try {
      const hostToken = uuidv4();
      const playerToken = uuidv4();
      const joinCode = generateJoinCode();

      // Create game
      const { data: game, error: gameErr } = await supabase
        .from('games')
        .insert({ status: 'lobby', host_token: hostToken, join_code: joinCode, teams_per_player: teamsPerPlayer, players_per_team: playersPerTeam })
        .select()
        .single();
      if (gameErr) throw gameErr;

      // Create player
      const { data: gamePlayer, error: playerErr } = await supabase
        .from('game_players')
        .insert({ game_id: game.id, player_name: createName.trim(), is_host: true, token: playerToken })
        .select()
        .single();
      if (playerErr) throw playerErr;

      setSession({
        playerId: gamePlayer.id,
        playerName: createName.trim(),
        hostToken,
        gameId: game.id,
      });
      localStorage.setItem('cf_game_id', game.id);

      navigate(`/lobby/${game.id}`);
    } catch (err) {
      setError(err.message || 'Failed to create game');
    } finally {
      setLoading(false);
    }
  }

  async function handleRejoin(e) {
    e.preventDefault();
    if (!rejoinName.trim() || !rejoinCode.trim()) return;
    setLoading(true);
    setError('');
    try {
      const code = rejoinCode.trim().toUpperCase();

      // Find game
      const { data: game, error: gameErr } = await supabase
        .from('games')
        .select('*')
        .eq('join_code', code)
        .single();
      if (gameErr || !game) throw new Error('Game not found. Check the code and try again.');

      // Find player (case-insensitive)
      const { data: players, error: playerErr } = await supabase
        .from('game_players')
        .select('*')
        .eq('game_id', game.id)
        .ilike('player_name', rejoinName.trim());
      if (playerErr) throw playerErr;
      if (!players || players.length === 0) throw new Error('No player with that name found in this game');

      const gamePlayer = players[0];
      const hostToken = gamePlayer.is_host ? game.host_token : null;

      setSession({
        playerId: gamePlayer.id,
        playerName: gamePlayer.player_name,
        hostToken,
        gameId: game.id,
      });
      localStorage.setItem('cf_game_id', game.id);

      if (game.status === 'lobby') {
        navigate(`/lobby/${game.id}`);
      } else if (['drafting_teams', 'selecting_players', 'selecting_captain'].includes(game.status)) {
        navigate(`/draft/${game.id}`);
      } else {
        navigate(`/leaderboard/${game.id}`);
      }
    } catch (err) {
      setError(err.message || 'Failed to rejoin game');
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin(e) {
    e.preventDefault();
    if (!joinName.trim() || !joinCode.trim()) return;
    setLoading(true);
    setError('');
    try {
      const code = joinCode.trim().toUpperCase();

      // Find game
      const { data: game, error: gameErr } = await supabase
        .from('games')
        .select('*')
        .eq('join_code', code)
        .single();
      if (gameErr || !game) throw new Error('Game not found. Check the code and try again.');

      if (game.status !== 'lobby') {
        throw new Error('This game has already started.');
      }

      // Create player
      const playerToken = uuidv4();
      const { data: gamePlayer, error: playerErr } = await supabase
        .from('game_players')
        .insert({ game_id: game.id, player_name: joinName.trim(), is_host: false, token: playerToken })
        .select()
        .single();
      if (playerErr) throw playerErr;

      setSession({
        playerId: gamePlayer.id,
        playerName: joinName.trim(),
        hostToken: null,
        gameId: game.id,
      });
      localStorage.setItem('cf_game_id', game.id);

      navigate(`/lobby/${game.id}`);
    } catch (err) {
      setError(err.message || 'Failed to join game');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page page-narrow" style={{ paddingTop: 48 }}>
      {/* Hero */}
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
          <Mascot pose="celebrating" size={110} />
        </div>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--gold)', marginBottom: 8 }}>
          Copa Fantasy 2026
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>
          Draft your teams, pick your players, compete with friends
        </p>
      </div>

      {/* Tab selector */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: 8,
          background: 'var(--card-bg)',
          padding: 6,
          borderRadius: 'var(--radius)',
          border: '1px solid var(--border)',
          marginBottom: 24,
        }}
      >
        <button
          className="btn"
          onClick={() => { setTab('create'); setError(''); }}
          style={{
            background: tab === 'create' ? 'var(--gold)' : 'transparent',
            color: tab === 'create' ? '#0a0a0f' : 'var(--text-muted)',
            fontWeight: 700,
          }}
        >
          Create Game
        </button>
        <button
          className="btn"
          onClick={() => { setTab('join'); setError(''); }}
          style={{
            background: tab === 'join' ? 'var(--gold)' : 'transparent',
            color: tab === 'join' ? '#0a0a0f' : 'var(--text-muted)',
            fontWeight: 700,
          }}
        >
          Join Game
        </button>
        <button
          className="btn"
          onClick={() => { setTab('rejoin'); setError(''); }}
          style={{
            background: tab === 'rejoin' ? 'var(--gold)' : 'transparent',
            color: tab === 'rejoin' ? '#0a0a0f' : 'var(--text-muted)',
            fontWeight: 700,
          }}
        >
          Rejoin Game
        </button>
      </div>

      {/* Create form */}
      {tab === 'create' && (
        <div className="card">
          <h2 style={{ fontWeight: 700, fontSize: '1.2rem', marginBottom: 20 }}>Create a New Game</h2>
          <form onSubmit={handleCreate}>
            <div className="form-group">
              <label className="input-label">Your Name</label>
              <input
                className="input"
                type="text"
                placeholder="Enter your name"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                maxLength={32}
                required
              />
            </div>
            <div className="form-group">
              <label className="input-label">Teams per Player</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[4, 6, 8].map(n => (
                  <button
                    key={n}
                    type="button"
                    className="btn"
                    onClick={() => setTeamsPerPlayer(n)}
                    style={{
                      flex: 1,
                      background: teamsPerPlayer === n ? 'var(--gold)' : 'var(--dark-bg)',
                      color: teamsPerPlayer === n ? '#0a0a0f' : 'var(--text-muted)',
                      fontWeight: 700,
                      border: `1px solid ${teamsPerPlayer === n ? 'var(--gold)' : 'var(--border)'}`,
                    }}
                  >{n}</button>
                ))}
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                {teamsPerPlayer === 4 ? 'Great for 10+ players' : teamsPerPlayer === 6 ? 'Good for 7–9 players' : 'Standard for up to 6 players'}
              </p>
            </div>
            <div className="form-group">
              <label className="input-label">Players per Team</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[3, 4, 5].map(n => (
                  <button
                    key={n}
                    type="button"
                    className="btn"
                    onClick={() => setPlayersPerTeam(n)}
                    style={{
                      flex: 1,
                      background: playersPerTeam === n ? 'var(--gold)' : 'var(--dark-bg)',
                      color: playersPerTeam === n ? '#0a0a0f' : 'var(--text-muted)',
                      fontWeight: 700,
                      border: `1px solid ${playersPerTeam === n ? 'var(--gold)' : 'var(--border)'}`,
                    }}
                  >{n}</button>
                ))}
              </div>
            </div>
            {error && <div style={{ color: 'var(--danger)', fontSize: '0.85rem', marginBottom: 12 }}>{error}</div>}
            <button
              type="submit"
              className="btn btn-primary btn-full btn-lg"
              disabled={loading || !createName.trim()}
            >
              {loading ? 'Creating...' : '🚀 Create Game'}
            </button>
          </form>
          <div className="mt-16" style={{ color: 'var(--text-muted)', fontSize: '0.82rem', lineHeight: 1.6 }}>
            <strong style={{ color: 'var(--text)' }}>As host you can:</strong>
            <ul style={{ marginTop: 6, paddingLeft: 16 }}>
              <li>Start the draft when everyone has joined</li>
              <li>Poke players when it&apos;s their turn</li>
              <li>Manage scores on the leaderboard</li>
              <li>Advance draft phases</li>
            </ul>
          </div>
        </div>
      )}

      {/* Rejoin form */}
      {tab === 'rejoin' && (
        <div className="card">
          <h2 style={{ fontWeight: 700, fontSize: '1.2rem', marginBottom: 20 }}>Rejoin a Game</h2>
          <form onSubmit={handleRejoin}>
            <div className="form-group">
              <label className="input-label">Game Code</label>
              <input
                className="input"
                type="text"
                placeholder="XXXXXX"
                value={rejoinCode}
                onChange={(e) => setRejoinCode(e.target.value.toUpperCase())}
                maxLength={6}
                style={{ textTransform: 'uppercase', letterSpacing: '0.15em', fontSize: '1.2rem', fontWeight: 700 }}
                required
              />
            </div>
            <div className="form-group">
              <label className="input-label">Your Name</label>
              <input
                className="input"
                type="text"
                placeholder="Enter your name"
                value={rejoinName}
                onChange={(e) => setRejoinName(e.target.value)}
                maxLength={32}
                required
              />
            </div>
            {error && <div style={{ color: 'var(--danger)', fontSize: '0.85rem', marginBottom: 12 }}>{error}</div>}
            <button
              type="submit"
              className="btn btn-primary btn-full btn-lg"
              disabled={loading || !rejoinCode.trim() || !rejoinName.trim()}
            >
              {loading ? 'Rejoining...' : '🔄 Rejoin Game'}
            </button>
          </form>
          <div className="mt-16" style={{ color: 'var(--text-muted)', fontSize: '0.82rem', lineHeight: 1.6 }}>
            Lost your session? Enter the game code and the name you originally used to get back in.
          </div>
        </div>
      )}

      {/* Join form */}
      {tab === 'join' && (
        <div className="card">
          <h2 style={{ fontWeight: 700, fontSize: '1.2rem', marginBottom: 20 }}>Join a Game</h2>
          <form onSubmit={handleJoin}>
            <div className="form-group">
              <label className="input-label">Game Code</label>
              <input
                className="input"
                type="text"
                placeholder="XXXXXX"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                maxLength={6}
                style={{ textTransform: 'uppercase', letterSpacing: '0.15em', fontSize: '1.2rem', fontWeight: 700 }}
                required
              />
            </div>
            <div className="form-group">
              <label className="input-label">Your Name</label>
              <input
                className="input"
                type="text"
                placeholder="Enter your name"
                value={joinName}
                onChange={(e) => setJoinName(e.target.value)}
                maxLength={32}
                required
              />
            </div>
            {error && <div style={{ color: 'var(--danger)', fontSize: '0.85rem', marginBottom: 12 }}>{error}</div>}
            <button
              type="submit"
              className="btn btn-primary btn-full btn-lg"
              disabled={loading || !joinCode.trim() || !joinName.trim()}
            >
              {loading ? 'Joining...' : '🎮 Join Game'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
