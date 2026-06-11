import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.js';

export function useDraft(gameId) {
  const [picks, setPicks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!gameId) return;
    setLoading(true);
    supabase.from('draft_picks').select('*').eq('game_id', gameId).order('pick_number', { ascending: true })
      .then(({ data }) => { setPicks(data || []); setLoading(false); });

    const channel = supabase.channel(`draft-${gameId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'draft_picks', filter: `game_id=eq.${gameId}`
      }, payload => setPicks(prev => [...prev, payload.new].sort((a,b) => a.pick_number - b.pick_number)))
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [gameId]);

  return { picks, loading };
}
