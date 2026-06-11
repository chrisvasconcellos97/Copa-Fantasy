import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase.js';

export function useNotifications(myPlayerId) {
  const [unread, setUnread] = useState(0);
  const [showPoke, setShowPoke] = useState(false);
  const [pokeMessage, setPokeMessage] = useState('');
  const channelRef = useRef(null);

  useEffect(() => {
    if (!myPlayerId) return;

    let cancelled = false;

    async function loadUnread() {
      const { count } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('game_player_id', myPlayerId)
        .eq('read', false);
      if (!cancelled) setUnread(count || 0);
    }

    loadUnread();

    const channel = supabase
      .channel(`notif-${myPlayerId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `game_player_id=eq.${myPlayerId}`,
        },
        async (payload) => {
          if (cancelled) return;
          const notif = payload.new;
          setUnread((prev) => prev + 1);
          if (notif.type === 'poke') {
            setPokeMessage(notif.message || "It's your turn to pick!");
            setShowPoke(true);
          }
          // Mark as read
          await supabase
            .from('notifications')
            .update({ read: true })
            .eq('id', notif.id);
          if (!cancelled) setUnread((prev) => Math.max(0, prev - 1));
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [myPlayerId]);

  function dismissPoke() {
    setShowPoke(false);
    setPokeMessage('');
  }

  return { unread, showPoke, dismissPoke, pokeMessage };
}
