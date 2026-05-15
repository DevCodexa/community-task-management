import { supabase } from './supabase'

export type CommunitySettings = {
  id: string
  logo_url: string
  app_name: string
  app_subtitle: string
  dashboard_title: string
  dashboard_subtitle: string
  created_at?: string
  updated_at?: string
}

export type MenuIconKey =
  | 'layout_dashboard'
  | 'users'
  | 'link2'
  | 'external_link'
  | 'mic'
  | 'calendar'
  | 'cake'
  | 'puzzle'
  | 'megaphone'
  | 'settings'

export type MenuItem = {
  id: string
  label: string
  path: string
  is_active: boolean
  icon_key: MenuIconKey | string
  created_at?: string
  updated_at?: string
}

export type SidebarHeader = {
  logoUrl: string
  appName: string
  appSubtitle: string
}

export const defaultCommunitySettings: CommunitySettings = {
  id: '00000000-0000-0000-0000-000000000001',
  logo_url: '',
  app_name: 'Topluluk',
  app_subtitle: 'Görev Yönetimi',
  dashboard_title: 'Dashboard',
  dashboard_subtitle: 'Topluluk görev yönetimine genel bakış',
}

const ensureSingletonId = '00000000-0000-0000-0000-000000000001'

export const getCommunitySettings = async (): Promise<CommunitySettings> => {
  const { data, error } = await supabase
    .from('community_settings')
    .select('*')
    .eq('id', ensureSingletonId)
    .maybeSingle()

  if (error) throw error
  return (data as CommunitySettings) || defaultCommunitySettings
}

export const upsertCommunitySettings = async (
  patch: Partial<Omit<CommunitySettings, 'id' | 'created_at' | 'updated_at'>>
): Promise<CommunitySettings> => {
  const payload: Partial<CommunitySettings> = {
    id: ensureSingletonId,
    ...patch,
  }

  const { data, error } = await supabase
    .from('community_settings')
    .upsert(payload, { onConflict: 'id' })
    .select('*')
    .single()

  if (error) throw error
  return data as CommunitySettings
}

export const getActiveMenuItems = async (): Promise<MenuItem[]> => {
  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: true })

  if (error) throw error
  return (data as MenuItem[]) || []
}

export const getMenuItems = async (): Promise<MenuItem[]> => {
  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) throw error
  return (data as MenuItem[]) || []
}

export const upsertMenuItem = async (item: {
  id?: string
  label: string
  path: string
  is_active: boolean
  icon_key: MenuItem['icon_key']
}): Promise<MenuItem> => {
  const payload = {
    id: item.id,
    label: item.label,
    path: item.path,
    is_active: item.is_active,
    icon_key: item.icon_key,
  }

  // If id is missing, we insert new. If id exists, upsert by id.
  const { data, error } = await supabase
    .from('menu_items')
    .upsert(payload, { onConflict: 'id' })
    .select('*')
    .single()

  if (error) throw error
  return data as MenuItem
}

export const setMenuItemActive = async (id: string, is_active: boolean): Promise<MenuItem> => {
  const { data, error } = await supabase
    .from('menu_items')
    .update({ is_active })
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw error
  return data as MenuItem
}

export const createMenuItem = async (item: {
  label: string
  path: string
  is_active: boolean
  icon_key: MenuItem['icon_key']
}): Promise<MenuItem> => {
  const { data, error } = await supabase
    .from('menu_items')
    .insert([item])
    .select('*')
    .single()

  if (error) throw error
  return data as MenuItem
}

// We will return the lucide-react *component* name by mapping icon_key values.
// Sidebar already imports lucide icons statically, so this helper is mainly for type-safety.
export const iconKeyToLucideName = (key: string): MenuIconKey | string => {
  switch (key) {
    case 'layout_dashboard':
      return 'layout_dashboard'
    case 'users':
      return 'users'
    case 'link2':
      return 'link2'
    case 'external_link':
      return 'external_link'
    case 'mic':
      return 'mic'
    case 'calendar':
      return 'calendar'
    case 'cake':
      return 'cake'
    case 'puzzle':
      return 'puzzle'
    case 'megaphone':
      return 'megaphone'
    case 'settings':
      return 'settings'
    default:
      return key
  }
}



