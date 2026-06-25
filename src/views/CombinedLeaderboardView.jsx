import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function CombinedLeaderboardView() {
  const { gameId } = useParams();
  const [groupA, setGroupA] = useState(null);
  const [groupB, setGroupB] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      // Load game A and find linked game B
      const { data: gameA } = await supabase.from('games').select('id, linked_game_id').eq('id', gameId).single();
      const gameBId = gameA?.linked_game_id;

      const [aData, bData] = await Promise.all([
        loadGroup(gameId, 'A'),
        gameBId ? loadGroup(gameBId, 'B') : Promise.resolve(null),
      ]);
      setGroupA(aData);
      setGroupB(bData);
      setLoading(false);
    }
    load();
  }, [gameId]);

  async function loadGroup(gId, label) {
    const [{ data: players }, { data: scores }] = await Promise.all([
      supabase.from('game_players').select('id, player_name').eq('game_id', gId),
      supabase.from('user_scores').select('game_player_id, total_points').eq('game_id', gId),
    ]);

    const scoreMap = {};
    for (const s of scores || []) scoreMap[s.game_player_id] = s.total_points;

    const ranked = (players || [])
      .map(p => ({ name: p.player_name, points: scoreMap[p.id] ?? 0 }))
      .sort((a, b) => b.points - a.points);

    return { label, ranked };
  }

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
        Loading...
      </div>
    );
  }

  const RANK_MEDAL = ['🥇', '🥈', '🥉'];

  function GroupColumn({ group }) {
    if (!group) return null;
    return (
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          textAlign: 'center',
          fontWeight: 800,
          fontSize: '0.9rem',
          color: 'var(--gold)',
          marginBottom: 10,
          padding: '6px 0',
          borderBottom: '2px solid var(--gold)',
          letterSpacing: '0.05em',
        }}>
          GROUP {group.label}
        </div>
        {group.ranked.map((entry, i) => (
          <div key={`${group.label}-${i}-${entry.name}`} style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '9px 10px',
            borderBottom: '1px solid var(--border)',
            gap: 6,
          }}>
            <span style={{ fontSize: '1rem', flexShrink: 0, minWidth: 24, textAlign: 'center' }}>
              {RANK_MEDAL[i] || `#${i + 1}`}
            </span>
            <span style={{
              flex: 1,
              fontWeight: 600,
              fontSize: '0.88rem',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {entry.name}
            </span>
            <span style={{
              fontWeight: 800,
              fontSize: '0.95rem',
              color: i === 0 ? 'var(--gold)' : 'var(--text)',
              flexShrink: 0,
            }}>
              {entry.points}<span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 500 }}>pts</span>
            </span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="page page-narrow" style={{ paddingTop: 24 }}>
      <h1 style={{ textAlign: 'center', fontSize: '1.4rem', fontWeight: 800, color: 'var(--gold)', marginBottom: 4 }}>
        ⚽ Copa Fantasy 2026
      </h1>
      <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: 20 }}>
        Standings Update
      </p>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
          <GroupColumn group={groupA} />
          {groupB && (
            <>
              <div style={{ width: 1, background: 'var(--border)' }} />
              <GroupColumn group={groupB} />
            </>
          )}
        </div>
        <p style={{ textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-muted)', padding: '8px 0' }}>
          copa-fantasy-psi.vercel.app
        </p>
      </div>

      {!groupB && (
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 16 }}>
          No Group B found. Split into groups first to see both here.
        </p>
      )}
    </div>
  );
}
