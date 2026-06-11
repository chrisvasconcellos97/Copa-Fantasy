import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useNotifications(myPlayerId) {
  const [unread, setUnread] = useState(0);
  const [showPoke, setShowPoke] = useState(false);
  const [pokeMessage, setPokeMessage] = useState('');

  const dismissPoke = useCallback(() => {
    setShowPoke(false);
    setPokeMessage('');
  }, []);

  useEffect(() => {
    if (!myPlayerId) return;

    let isMounted = true;

    async function fetchUnread() {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('game_player_id', myPlayerId)
        .eq('read', false);
      if (isMounted) setUnread(count || 0);
    }

    fetchUnread();

    const channel = supabase
      .channel(`notifications-${myPlayerId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `game_player_id=eq.${myPlayerId}`,
        },
        async (payload) => {
          if (!isMounted) return;
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
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [myPlayerId]);

  return { unread, showPoke, dismissPoke, pokeMessage };
}
