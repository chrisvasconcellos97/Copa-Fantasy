import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Subscribes to notifications for myPlayerId, surfaces poke toasts, and marks them read.
 * @param {string} myPlayerId
 * @returns {{ unread: number, showPoke: boolean, dismissPoke: Function, pokeMessage: string }}
 */
export function useNotifications(myPlayerId) {
  const [unread, setUnread] = useState(0);
  const [showPoke, setShowPoke] = useState(false);
  const [pokeMessage, setPokeMessage] = useState('');

  const dismissPoke = useCallback(() => setShowPoke(false), []);

  useEffect(() => {
    if (!myPlayerId) return;

    let cancelled = false;

    // Load existing unread count
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
          if (cancelled) return;
          const notification = payload.new;
          setUnread((prev) => prev + 1);

          if (notification.type === 'poke') {
            setPokeMessage(notification.message || "It's your turn to pick!");
            setShowPoke(true);
          }

          // Mark as read after a brief delay
          setTimeout(async () => {
            await supabase
              .from('notifications')
              .update({ read: true })
              .eq('id', notification.id);
            if (!cancelled) setUnread((prev) => Math.max(0, prev - 1));
          }, 6000);
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [myPlayerId]);

  return { unread, showPoke, dismissPoke, pokeMessage };
}
