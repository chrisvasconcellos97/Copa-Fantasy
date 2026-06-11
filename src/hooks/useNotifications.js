import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useNotifications(myPlayerId) {
  const [unread, setUnread] = useState([]);

  useEffect(() => {
    if (!myPlayerId) return;
    let sub;

    async function load() {
      const { data } = await supabase.from('notifications').select('*')
        .eq('game_player_id', myPlayerId).eq('read', false).order('created_at', { ascending: false });
      setUnread(data || []);
    }
    load();

    sub = supabase.channel('notifs-' + myPlayerId)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: 'game_player_id=eq.' + myPlayerId },
        (p) => setUnread(prev => [p.new, ...prev]))
      .subscribe();

    return () => { supabase.removeChannel(sub); };
  }, [myPlayerId]);

  async function markRead(notifId) {
    await supabase.from('notifications').update({ read: true }).eq('id', notifId);
    setUnread(prev => prev.filter(n => n.id !== notifId));
  }

  return { unread, markRead };
}
