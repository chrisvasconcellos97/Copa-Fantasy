import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useNotifications(myPlayerId) {
  const [unread, setUnread] = useState(0);
  const [showPoke, setShowPoke] = useState(false);
  const [pokeMessage, setPokeMessage] = useState('');

  useEffect(() => {
    if (!myPlayerId) return;

    let mounted = true;
    let dismissTimer = null;

    // Load existing unread count
    async function loadUnread() {
      const { count } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('game_player_id', myPlayerId)
        .eq('read', false);
      if (mounted) setUnread(count || 0);
    }

    loadUnread();

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
          if (!mounted) return;
          const notif = payload.new;
          setUnread((prev) => prev + 1);

          if (notif.type === 'poke') {
            setPokeMessage(notif.message || "It's your turn to pick!");
            setShowPoke(true);
            if (dismissTimer) clearTimeout(dismissTimer);
            dismissTimer = setTimeout(() => {
              if (mounted) setShowPoke(false);
            }, 6000);

            // Mark as read
            await supabase
              .from('notifications')
              .update({ read: true })
              .eq('id', notif.id);
            setUnread((prev) => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      if (dismissTimer) clearTimeout(dismissTimer);
      supabase.removeChannel(channel);
    };
  }, [myPlayerId]);

  const dismissPoke = useCallback(() => {
    setShowPoke(false);
  }, []);

  return { unread, showPoke, dismissPoke, pokeMessage };
}
