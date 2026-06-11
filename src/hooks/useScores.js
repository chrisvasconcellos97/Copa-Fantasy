import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.js';

export function useScores(gameId) {
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!gameId) return;
    setLoading(true);
    supabase.from('user_scores').select('*').eq('game_id', gameId).order('total_points', { ascending: false })
      .then(({ data }) => { setScores(data || []); setLoading(false); });

    const channel = supabase.channel(`scores-${gameId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'user_scores', filter: `game_id=eq.${gameId}`
      }, payload => setScores(prev => prev.map(s => s.id === payload.new.id ? payload.new : s).sort((a,b) => b.total_points - a.total_points)))
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'user_scores', filter: `game_id=eq.${gameId}`
      }, payload => setScores(prev => [...prev, payload.new].sort((a,b) => b.total_points - a.total_points)))
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [gameId]);

  return { scores, loading };
}
