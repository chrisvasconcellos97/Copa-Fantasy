import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.js';

export function useNotifications(myPlayerId) {
  const [unread, setUnread] = useState([]);
  const [showPoke, setShowPoke] = useState(false);
  const [pokeMessage, setPokeMessage] = useState('');

  useEffect(() => {
    if (!myPlayerId) return;
    supabase.from('notifications').select('*').eq('game_player_id', myPlayerId).eq('read', false)
      .then(({ data }) => setUnread(data || []));

    const channel = supabase.channel(`notif-${myPlayerId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications', filter: `game_player_id=eq.${myPlayerId}`
      }, payload => {
        setUnread(prev => [...prev, payload.new]);
        setPokeMessage(payload.new.message || 'You have been poked!');
        setShowPoke(true);
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [myPlayerId]);

  const dismissPoke = async () => {
    setShowPoke(false);
    if (unread.length > 0) {
      await supabase.from('notifications')
        .update({ read: true })
        .eq('game_player_id', myPlayerId)
        .eq('read', false);
      setUnread([]);
    }
  };

  return { unread, showPoke, dismissPoke, pokeMessage };
}
