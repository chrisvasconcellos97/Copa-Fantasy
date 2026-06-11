import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getOrCreateToken, setPlayerName, setGameId, getPlayerName } from '../lib/session';

function generateCode() {
  return Math.random().toString(36).substring(2,8).toUpperCase();
}

export default function HomeView() {
  const nav = useNavigate();
  const [createName, setCreateName] = useState(getPlayerName());
  const [joinName, setJoinName] = useState(getPlayerName());
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleCreate() {
    if (!createName.trim()) return setError('Enter your name');
    setLoading(true); setError('');
    const token = getOrCreateToken();
    setPlayerName(createName.trim());
    const code = generateCode();

    const { data: game, error: ge } = await supabase.from('games').insert({
      code, host_session_token: token, status: 'lobby', current_pick_number: 1, wc_season: 2026
    }).select().single();
    if (ge) { setError(ge.message); setLoading(false); return; }

    await supabase.from('game_players').insert({
      game_id: game.id, name: createName.trim(), session_token: token, draft_order: 0
    });

    setGameId(game.id);
    nav(`/lobby/${game.id}`);
  }

  async function handleJoin() {
    if (!joinName.trim()) return setError('Enter your name');
    if (!joinCode.trim()) return setError('Enter game code');
    setLoading(true); setError('');
    const token = getOrCreateToken();
    setPlayerName(joinName.trim());

    const { data: game, error: ge } = await supabase.from('games').select('*').eq('code', joinCode.trim().toUpperCase()).single();
    if (ge || !game) { setError('Game not found'); setLoading(false); return; }
    if (game.status !== 'lobby') { setError('Game already started'); setLoading(false); return; }

    const { data: existing } = await supabase.from('game_players').select('id').eq('game_id', game.id).eq('session_token', token).single();
    if (!existing) {
      const { data: allPlayers } = await supabase.from('game_players').select('draft_order').eq('game_id', game.id).order('draft_order', { ascending: false }).limit(1);
      const nextOrder = allPlayers?.length ? (allPlayers[0].draft_order + 1) : 1;
      await supabase.from('game_players').insert({ game_id: game.id, name: joinName.trim(), session_token: token, draft_order: nextOrder });
    }

    setGameId(game.id);
    nav(`/lobby/${game.id}`);
  }

  return (
    <div className="view">
      <div style={{ textAlign:'center', padding:'2rem 0 1.5rem' }}>
        <div style={{ fontSize:'3rem', marginBottom:'0.5rem' }}>🏆</div>
        <h1>Copa Fantasy <span className="text-gold">2026</span></h1>
        <p className="text-muted mt-1">Draft teams. Pick players. Win the World Cup.</p>
      </div>

      {error && <div className="card" style={{ borderColor:'var(--danger)', marginBottom:'0.75rem' }}><p className="text-danger">{error}</p></div>}

      <div className="card mb-2">
        <h2 className="mb-2">Create Game</h2>
        <div className="field">
          <label className="label">Your Name</label>
          <input className="input" placeholder="Enter your name" value={createName} onChange={e => setCreateName(e.target.value)} />
        </div>
        <button className="btn btn-primary btn-block" onClick={handleCreate} disabled={loading}>Create New Game</button>
      </div>

      <div className="card">
        <h2 className="mb-2">Join Game</h2>
        <div className="field">
          <label className="label">Your Name</label>
          <input className="input" placeholder="Enter your name" value={joinName} onChange={e => setJoinName(e.target.value)} />
        </div>
        <div className="field">
          <label className="label">Game Code</label>
          <input className="input" placeholder="Enter 6-letter code" value={joinCode} onChange={e => setJoinCode(e.target.value)} maxLength={8} style={{ textTransform:'uppercase', letterSpacing:'0.1em' }} />
        </div>
        <button className="btn btn-secondary btn-block" onClick={handleJoin} disabled={loading}>Join Game</button>
      </div>
    </div>
  );
}
