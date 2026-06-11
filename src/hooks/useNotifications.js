import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase.js';

export function useNotifications(myPlayerId) {
  const [unread, setUnread] = useState(0);
  const [showPoke, setShowPoke] = useState(false);
  const [pokeMessage, setPokeMessage] = useState('');
  const dismissTimer = useRef(null);

  useEffect(() => {
    if (!myPlayerId) return;

    let mounted = true;

    async function fetchUnread() {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('game_player_id', myPlayerId)
        .eq('read', false);
      if (mounted) setUnread(count || 0);
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
          if (!mounted) return;
          const notification = payload.new;
          setUnread(prev => prev + 1);

          if (notification.type === 'poke') {
            setPokeMessage(notification.message || "It's your turn to pick!");
            setShowPoke(true);

            if (dismissTimer.current) clearTimeout(dismissTimer.current);
            dismissTimer.current = setTimeout(() => {
              if (mounted) {
                setShowPoke(false);
                markRead(notification.id);
              }
            }, 6000);
          }
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
      supabase.removeChannel(channel);
    };
  }, [myPlayerId]);

  async function markRead(notificationId) {
    if (notificationId) {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);
    }
  }

  function dismissPoke() {
    setShowPoke(false);
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
  }

  return { unread, showPoke, dismissPoke, pokeMessage };
}
