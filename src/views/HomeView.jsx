import React, { useState, useEffect } from 'react';
import Mascot from '../components/Mascot';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { setSession, bootstrapAuth } from '../lib/session';

export default function HomeView() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('create');

  // Auto-restore session from ?pt=<playerToken> deep link, or existing localStorage session
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pt = params.get('pt');

    // No deep link — check if we already have a valid session saved
    if (!pt) {
      const existing = JSON.parse(localStorage.getItem('copa_fantasy_session') || 'null');
      if (existing?.gameId && existing?.playerId) {
        supabase.from('games').select('status').eq('id', existing.gameId).single().then(({ data: game }) => {
          if (!game) return;
          if (game.status === 'lobby') navigate(`/lobby/${existing.gameId}`);
          else if (['drafting_teams', 'selecting_players', 'selecting_captain'].includes(game.status)) navigate(`/draft/${existing.gameId}`);
          else navigate(`/leaderboard/${existing.gameId}`);
        });
      }
      return;
    }
    (async () => {
      // Mint a JWT from the deep-link token; this also tells us who we are.
      const player = await bootstrapAuth(pt);
      if (!player) return;
      const { data: game } = await supabase.from('games').select('id, status').eq('id', player.game_id).single();
      if (!game) return;
      setSession({
        playerId: player.id,
        playerName: player.player_name,
        playerToken: pt,
        isHost: player.is_host === true,
        gameId: game.id,
      });
      localStorage.setItem('cf_game_id', game.id);
      window.history.replaceState({}, '', '/');
      if (game.status === 'lobby') navigate(`/lobby/${game.id}`);
      else if (['drafting_teams', 'selecting_players', 'selecting_captain'].includes(game.status)) navigate(`/draft/${game.id}`);
      else navigate(`/leaderboard/${game.id}`);
    })();
  }, []);
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
      const { data, error: rpcErr } = await supabase.rpc('create_game', {
        p_host_name: createName.trim(),
        p_teams_per_player: teamsPerPlayer,
        p_players_per_team: playersPerTeam,
      });
      if (rpcErr) throw rpcErr;

      await bootstrapAuth(data.player_token);
      setSession({
        playerId: data.player_id,
        playerName: createName.trim(),
        playerToken: data.player_token,
        isHost: true,
        gameId: data.game_id,
      });
      localStorage.setItem('cf_game_id', data.game_id);

      navigate(`/lobby/${data.game_id}`);
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

      // Look up the player's token by game code + name, then mint a JWT.
      const { data, error: rpcErr } = await supabase.rpc('rejoin_lookup', {
        p_join_code: code,
        p_player_name: rejoinName.trim(),
      });
      if (rpcErr) throw new Error(rpcErr.message || 'Failed to rejoin game');

      await bootstrapAuth(data.player_token);
      setSession({
        playerId: data.player_id,
        playerName: rejoinName.trim(),
        playerToken: data.player_token,
        isHost: data.is_host === true,
        gameId: data.game_id,
      });
      localStorage.setItem('cf_game_id', data.game_id);

      if (data.status === 'lobby') {
        navigate(`/lobby/${data.game_id}`);
      } else if (['drafting_teams', 'selecting_players', 'selecting_captain'].includes(data.status)) {
        navigate(`/draft/${data.game_id}`);
      } else {
        navigate(`/leaderboard/${data.game_id}`);
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

      const { data, error: rpcErr } = await supabase.rpc('join_game', {
        p_join_code: code,
        p_player_name: joinName.trim(),
      });
      if (rpcErr) throw new Error(rpcErr.message || 'Failed to join game');

      await bootstrapAuth(data.player_token);
      setSession({
        playerId: data.player_id,
        playerName: joinName.trim(),
        playerToken: data.player_token,
        isHost: false,
        gameId: data.game_id,
      });
      localStorage.setItem('cf_game_id', data.game_id);

      navigate(`/lobby/${data.game_id}`);
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
