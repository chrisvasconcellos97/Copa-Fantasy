import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useNotifications(gameId, myPlayerId, onNewNotification) {
  const [unread, setUnread] = useState([]);

  const markRead = useCallback(async (ids) => {
    if (!ids || ids.length === 0) return;
    await supabase
      .from('notifications')
      .update({ read: true })
      .in('id', ids);
    setUnread((prev) => prev.filter((n) => !ids.includes(n.id)));
  }, []);

  useEffect(() => {
    if (!gameId || !myPlayerId) return;

    let cancelled = false;

    async function fetchUnread() {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('game_id', gameId)
        .eq('game_player_id', myPlayerId)
        .eq('read', false)
        .order('created_at', { ascending: false });

      if (!cancelled && data) {
        setUnread(data);
      }
    }

    fetchUnread();

    const channel = supabase
      .channel(`notifications:${gameId}:${myPlayerId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `game_player_id=eq.${myPlayerId}`,
        },
        (payload) => {
          if (!cancelled) {
            setUnread((prev) => [payload.new, ...prev]);
            if (onNewNotification) {
              onNewNotification(payload.new);
            }
          }
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [gameId, myPlayerId, onNewNotification]);

  return { unread, markRead };
}
