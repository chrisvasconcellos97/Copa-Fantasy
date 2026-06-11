import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useNotifications(myPlayerId) {
  const [unread, setUnread] = useState(0);
  const [showPoke, setShowPoke] = useState(false);
  const [pokeMessage, setPokeMessage] = useState('');

  useEffect(() => {
    if (!myPlayerId) return;

    let isMounted = true;
    let dismissTimer = null;

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
            if (dismissTimer) clearTimeout(dismissTimer);
            dismissTimer = setTimeout(() => {
              if (isMounted) setShowPoke(false);
            }, 6000);

            // Mark as read
            await supabase
              .from('notifications')
              .update({ read: true })
              .eq('id', notif.id);
          }
        }
      )
      .subscribe();

    // Load unread count on mount
    supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('game_player_id', myPlayerId)
      .eq('read', false)
      .then(({ count }) => {
        if (isMounted && count) setUnread(count);
      });

    return () => {
      isMounted = false;
      if (dismissTimer) clearTimeout(dismissTimer);
      supabase.removeChannel(channel);
    };
  }, [myPlayerId]);

  const dismissPoke = useCallback(() => {
    setShowPoke(false);
    setUnread((prev) => Math.max(0, prev - 1));
  }, []);

  return { unread, showPoke, dismissPoke, pokeMessage };
}
