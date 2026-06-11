import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useNotifications(myPlayerId) {
  const [unread, setUnread] = useState([])

  useEffect(() => {
    if (!myPlayerId) return

    supabase.from('notifications').select('*').eq('game_player_id', myPlayerId).eq('read', false)
      .then(({ data }) => setUnread(data || []))

    const channel = supabase.channel('notifs-' + myPlayerId)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: 'game_player_id=eq.' + myPlayerId }, payload => {
        setUnread(prev => [...prev, payload.new])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [myPlayerId])

  const dismiss = useCallback(async (id) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id)
    setUnread(prev => prev.filter(n => n.id !== id))
  }, [])

  return { unread, dismiss }
}
