import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useNotifications(gameId, myPlayerId) {
  const [unread, setUnread] = useState([]);
  const [toastMessage, setToastMessage] = useState(null);

  const markRead = useCallback(async (notifId) => {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notifId);
  }, []);

  useEffect(() => {
    if (!gameId || !myPlayerId) return;

    async function loadUnread() {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('game_id', gameId)
        .eq('game_player_id', myPlayerId)
        .eq('read', false)
        .order('created_at', { ascending: false });
      setUnread(data || []);
    }

    loadUnread();

    const channel = supabase
      .channel(`notifications:${gameId}:${myPlayerId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `game_id=eq.${gameId}`,
      }, (payload) => {
        const notif = payload.new;
        if (notif.game_player_id !== myPlayerId) return;
        setUnread((prev) => [notif, ...prev]);
        setToastMessage(notif.message);
        setTimeout(() => {
          markRead(notif.id);
          setUnread((prev) => prev.filter((n) => n.id !== notif.id));
        }, 6000);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId, myPlayerId, markRead]);

  const dismissToast = useCallback(() => setToastMessage(null), []);

  return { unread, toastMessage, dismissToast };
}
