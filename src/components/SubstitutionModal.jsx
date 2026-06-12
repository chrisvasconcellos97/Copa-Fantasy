import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { normalizePosition } from '../lib/constants';
import { getSquadForTeam } from '../lib/wcSquads';

export default function SubstitutionModal({ gameId, gamePlayerId, draftPick, team, currentPlayers, onClose, onDone }) {
  const [candidates, setCandidates] = useState([]);
  const [selectedOut, setSelectedOut] = useState(null);
  const [selectedIn, setSelectedIn] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Full squad for this team (DB or fallback)
  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('players')
        .select('*')
        .eq('team_api_id', String(team?.api_id))
        .order('position');
      if (data && data.length > 0) {
        setCandidates(data);
      } else {
        const raw = getSquadForTeam(team?.name);
        if (raw) {
          setCandidates(raw.map(p => ({
            api_id: p.id,
            name: p.name,
            position: p.position,
            isTop: p.isTop,
          })));
        }
      }
    }
    if (team) load();
  }, [team]);

  const outPosition = selectedOut ? normalizePosition(candidates.find(c => c.api_id === selectedOut)?.position) : null;

  // Players eligible to come in: same position, not already picked
  const currentIds = currentPlayers.map(p => p.player_api_id || p.api_id);
  const eligibleIn = candidates.filter(c => {
    if (currentIds.includes(c.api_id)) return false;
    if (outPosition && normalizePosition(c.position) !== outPosition) return false;
    return true;
  });

  async function handleConfirm() {
    if (!selectedOut || !selectedIn) return;
    setSaving(true);
    setError('');
    try {
      const { error: err } = await supabase.from('substitutions').insert({
        game_id: gameId,
        game_player_id: gamePlayerId,
        draft_pick_id: draftPick.id,
        old_player_api_id: selectedOut,
        new_player_api_id: selectedIn,
      });
      if (err) throw err;
      onDone({ draftPickId: draftPick.id, oldId: selectedOut, newId: selectedIn });
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  const POS_COLOR = { GK: '#FFD700', DEF: '#22c55e', MID: '#3b82f6', FWD: '#ef4444' };

  function PlayerRow({ player, selected, onClick, dimmed }) {
    const pos = normalizePosition(player.position);
    return (
      <div
        onClick={dimmed ? undefined : onClick}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 12px',
          borderRadius: 8,
          border: `1px solid ${selected ? 'var(--gold)' : 'var(--border)'}`,
          background: selected ? 'rgba(255,215,0,0.08)' : dimmed ? 'rgba(0,0,0,0.2)' : 'var(--card-bg)',
          cursor: dimmed ? 'default' : 'pointer',
          opacity: dimmed ? 0.4 : 1,
          marginBottom: 6,
        }}
      >
        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: POS_COLOR[pos] || 'var(--text-muted)', minWidth: 32 }}>{pos}</span>
        <span style={{ flex: 1, fontSize: '0.88rem', fontWeight: 600 }}>{player.name}</span>
        {player.isTop && <span style={{ fontSize: '0.75rem' }}>⭐</span>}
        {selected && <span style={{ color: 'var(--gold)', fontSize: '0.8rem' }}>✓</span>}
      </div>
    );
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--dark-bg)', border: '1px solid var(--border)', borderRadius: '16px 16px 0 0', width: '100%', maxWidth: 480, maxHeight: '85vh', overflowY: 'auto', padding: '20px 20px 40px' }}>

        <div style={{ width: 36, height: 4, background: 'var(--border)', borderRadius: 2, margin: '0 auto 20px' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <h2 style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--gold)' }}>🔄 Make a Sub — {team?.name}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: 20 }}>You get one sub per team. Pick who goes out, then who comes in (same position only).</p>

        {/* Step 1: who goes out */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
            1. Who goes out?
          </div>
          {currentPlayers.map(p => {
            const player = candidates.find(c => c.api_id === (p.player_api_id || p.api_id)) || { api_id: p.player_api_id || p.api_id, name: p.name || p.player_api_id, position: p.position };
            return (
              <PlayerRow
                key={player.api_id}
                player={player}
                selected={selectedOut === player.api_id}
                onClick={() => { setSelectedOut(player.api_id); setSelectedIn(null); }}
              />
            );
          })}
        </div>

        {/* Step 2: who comes in */}
        {selectedOut && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
              2. Who comes in? ({outPosition} only)
            </div>
            {eligibleIn.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No {outPosition}s available in this squad.</p>
            ) : (
              eligibleIn.map(p => (
                <PlayerRow
                  key={p.api_id}
                  player={p}
                  selected={selectedIn === p.api_id}
                  onClick={() => setSelectedIn(p.api_id)}
                />
              ))
            )}
          </div>
        )}

        {error && <p style={{ color: 'var(--danger)', fontSize: '0.85rem', marginBottom: 12 }}>{error}</p>}

        <button
          className="btn btn-primary btn-full"
          disabled={!selectedOut || !selectedIn || saving}
          onClick={handleConfirm}
        >
          {saving ? 'Saving...' : 'Confirm Substitution'}
        </button>
      </div>
    </div>
  );
}
