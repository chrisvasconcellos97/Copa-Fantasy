import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useNotifications(myPlayerId) {
  const [unread, setUnread] = useState([]);
  const [showPoke, setShowPoke] = useState(false);
  const [pokeMessage, setPokeMessage] = useState('');

  const dismissPoke = useCallback(() => {
    setShowPoke(false);
  }, []);

  useEffect(() => {
    if (!myPlayerId) return;

    let channel;

    async function loadUnread() {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('game_player_id', myPlayerId)
        .eq('read', false)
        .order('created_at', { ascending: false });
      if (data && data.length > 0) {
        setUnread(data);
        const latest = data[0];
        if (latest.type === 'poke') {
          setPokeMessage(latest.message || "It's your turn to pick!");
          setShowPoke(true);
          // Mark as read
          await supabase
            .from('notifications')
            .update({ read: true })
            .eq('id', latest.id);
        }
      }
    }

    loadUnread();

    channel = supabase
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
          const notif = payload.new;
          setUnread((prev) => [notif, ...prev]);
          if (notif.type === 'poke') {
            setPokeMessage(notif.message || "It's your turn to pick!");
            setShowPoke(true);
            await supabase
              .from('notifications')
              .update({ read: true })
              .eq('id', notif.id);
          }
        }
      )
      .subscribe();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [myPlayerId]);

  return { unread, showPoke, dismissPoke, pokeMessage };
}
