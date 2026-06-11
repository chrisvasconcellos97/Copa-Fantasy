import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getOrCreateToken, setPlayerName, setGameId } from '../lib/session';

function generateCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export default function HomeView() {
  const navigate = useNavigate();
  const [createName, setCreateName] = useState('');
  const [joinName, setJoinName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!createName.trim()) return;
    setLoading(true);
    setError('');
    try {
      const token = getOrCreateToken();
      const code = generateCode();
      const { data: game, error: gameErr } = await supabase.from('games').insert({
        join_code: code,
        status: 'lobby',
        host_token: token,
        current_pick_number: 0,
      }).select().single();
      if (gameErr) throw gameErr;

      const { error: playerErr } = await supabase.from('game_players').insert({
        game_id: game.id,
        player_token: token,
        player_name: createName.trim(),
        is_host: true,
      });
      if (playerErr) throw playerErr;

      setPlayerName(createName.trim());
      setGameId(game.id);
      navigate(`/lobby/${game.id}`);
    } catch (err) {
      setError(err.message || 'Failed to create game');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!joinName.trim() || !joinCode.trim()) return;
    setLoading(true);
    setError('');
    try {
      const token = getOrCreateToken();
      const { data: game, error: findErr } = await supabase
        .from('games')
        .select('*')
        .eq('join_code', joinCode.trim().toUpperCase())
        .single();
      if (findErr || !game) throw new Error('Game not found. Check the code and try again.');

      // Check if already joined
      const { data: existing } = await supabase
        .from('game_players')
        .select('id')
        .eq('game_id', game.id)
        .eq('player_token', token)
        .maybeSingle();

      if (!existing) {
        const { error: playerErr } = await supabase.from('game_players').insert({
          game_id: game.id,
          player_token: token,
          player_name: joinName.trim(),
          is_host: false,
        });
        if (playerErr) throw playerErr;
      }

      setPlayerName(joinName.trim());
      setGameId(game.id);
      navigate(`/lobby/${game.id}`);
    } catch (err) {
      setError(err.message || 'Failed to join game');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page" style={{ maxWidth: 600 }}>
      <div className="text-center mb-6" style={{ paddingTop: 32 }}>
        <div style={{ fontSize: '4rem', marginBottom: 12 }}>⚽</div>
        <h1 className="h1 text-gold mb-2">Copa Fantasy 2026</h1>
        <p className="text-muted">Draft teams, pick players, compete with friends through the World Cup.</p>
      </div>

      {error && (
        <div style={{ background: 'rgba(217,83,79,0.15)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-sm)', padding: '12px 16px', marginBottom: 16, color: 'var(--danger)', fontSize: '0.9rem' }}>
          {error}
        </div>
      )}

      <div className="grid-2" style={{ gap: 16 }}>
        <div className="card">
          <h2 className="h3 mb-3">🎮 Create Game</h2>
          <p className="text-muted text-sm mb-4">Start a new league and invite friends with a code.</p>
          <form onSubmit={handleCreate}>
            <div className="form-group">
              <label className="label">Your Name</label>
              <input
                className="input"
                type="text"
                placeholder="e.g. Chris"
                value={createName}
                onChange={e => setCreateName(e.target.value)}
                maxLength={30}
                required
              />
            </div>
            <button className="btn btn-gold btn-full" type="submit" disabled={loading || !createName.trim()}>
              {loading ? 'Creating…' : 'Create Game'}
            </button>
          </form>
        </div>

        <div className="card">
          <h2 className="h3 mb-3">🔑 Join Game</h2>
          <p className="text-muted text-sm mb-4">Enter a code shared by the host to join their league.</p>
          <form onSubmit={handleJoin}>
            <div className="form-group">
              <label className="label">Your Name</label>
              <input
                className="input"
                type="text"
                placeholder="e.g. Alex"
                value={joinName}
                onChange={e => setJoinName(e.target.value)}
                maxLength={30}
                required
              />
            </div>
            <div className="form-group">
              <label className="label">Game Code</label>
              <input
                className="input"
                type="text"
                placeholder="e.g. ABC123"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                maxLength={8}
                style={{ textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 700 }}
                required
              />
            </div>
            <button className="btn btn-gold btn-full" type="submit" disabled={loading || !joinName.trim() || !joinCode.trim()}>
              {loading ? 'Joining…' : 'Join Game'}
            </button>
          </form>
        </div>
      </div>

      <div className="card mt-4" style={{ textAlign: 'center' }}>
        <h3 className="h3 mb-2">How It Works</h3>
        <div className="grid-3 mt-3" style={{ textAlign: 'left', gap: 12 }}>
          <div>
            <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>🏟️</div>
            <div className="font-bold text-sm mb-1">Snake Draft</div>
            <div className="text-muted text-xs">Take turns picking 2 teams from each pot in snake order.</div>
          </div>
          <div>
            <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>⚽</div>
            <div className="font-bold text-sm mb-1">Pick Players</div>
            <div className="text-muted text-xs">Select players from your drafted teams to earn bonus points.</div>
          </div>
          <div>
            <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>🏆</div>
            <div className="font-bold text-sm mb-1">Score Points</div>
            <div className="text-muted text-xs">Teams earn points per win, draw, and each knockout round won.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
