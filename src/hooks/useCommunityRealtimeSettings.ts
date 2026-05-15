import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  CommunitySettings,
  defaultCommunitySettings,
  MenuItem,
  getActiveMenuItems,
  getCommunitySettings,
} from '../lib/supabaseCommunitySettings'

type State = {
  settings: CommunitySettings
  menuItems: MenuItem[]
}

export const useCommunityRealtimeSettings = () => {
  const [state, setState] = useState<State>({
    settings: defaultCommunitySettings,
    menuItems: [],
  })

  const channelName = useMemo(() => {
    return `community-settings-realtime`
  }, [])

  useEffect(() => {
    let mounted = true

    const loadInitial = async () => {
      const [settings, menuItems] = await Promise.all([
        getCommunitySettings(),
        getActiveMenuItems(),
      ])

      if (!mounted) return
      setState({ settings, menuItems })
    }

    loadInitial().catch((e) => console.error('Realtime initial load failed', e))

    // Eğer environment tarafında realtime/websocket kurulumu api-key sorunu yüzünden patlıyorsa,
    // initial load çalışmaya devam etsin diye subscribe’ı non-fatal yapıyoruz.
    let channel: ReturnType<typeof supabase.channel> | null = null

    try {
      channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'community_settings' },
          async () => {
            const settings = await getCommunitySettings().catch((e) => {
              console.error('Failed to reload community_settings', e)
              return defaultCommunitySettings
            })
            if (!mounted) return
            setState((prev) => ({ ...prev, settings }))
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'menu_items' },
          async () => {
            const menuItems = await getActiveMenuItems().catch((e) => {
              console.error('Failed to reload menu_items', e)
              return [] as MenuItem[]
            })
            if (!mounted) return
            setState((prev) => ({ ...prev, menuItems }))
          }
        )
        .subscribe()
    } catch (e) {
      console.error('Realtime subscribe failed (non-fatal).', e)
    }

    return () => {
      mounted = false
      if (!channel) return
      try {
        supabase.removeChannel(channel)
      } catch {
        // ignore
      }
    }
  }, [channelName])

  return state
}

