import React, { useEffect, useMemo, useState } from 'react'
import { Plus, Edit3, Save, EyeOff } from 'lucide-react'

import {
  CommunitySettings,
  MenuItem,
  defaultCommunitySettings,
  getMenuItems,
  getCommunitySettings,
  upsertCommunitySettings,
  createMenuItem,
  setMenuItemActive,
  upsertMenuItem,
} from '../lib/supabaseCommunitySettings'


type MenuForm = {
  id?: string
  label: string
  path: string
  icon_key: string
  is_active: boolean
}

const iconOptions: Array<{ key: string; label: string }> = [
  { key: 'layout_dashboard', label: 'Dashboard' },
  { key: 'users', label: 'Üye Yönetimi' },
  { key: 'link2', label: 'Görev Zinciri' },
  { key: 'external_link', label: 'Linkler' },
  { key: 'mic', label: 'Konuşmacılar' },
  { key: 'calendar', label: 'Etkinlikler' },
  { key: 'cake', label: 'Doğum Günleri' },
  { key: 'puzzle', label: 'Bölümler' },
  { key: 'megaphone', label: 'Duyurular' },
  { key: 'settings', label: 'Topluluk Ayarları' },
]

export const CommunitySettingsPage: React.FC = () => {
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState<CommunitySettings>(defaultCommunitySettings)
  const [menuItems, setMenuItemsState] = useState<MenuItem[]>([])

  // sidebar header form
  const [logoUrl, setLogoUrl] = useState('')
  const [appName, setAppName] = useState('')
  const [appSubtitle, setAppSubtitle] = useState('')
  const [dashboardTitle, setDashboardTitle] = useState('')
  const [dashboardSubtitle, setDashboardSubtitle] = useState('')

  // menu form
  const emptyMenuForm: MenuForm = useMemo(
    () => ({
      label: '',
      path: '',
      icon_key: 'layout_dashboard',
      is_active: true,
    }),
    []
  )

  const [menuForm, setMenuForm] = useState<MenuForm>(emptyMenuForm)
  const [editingMenuId, setEditingMenuId] = useState<string | null>(null)

  const reloadMenuItems = async () => {
    const items = await getMenuItems()
    setMenuItemsState(items)
  }

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [s, items] = await Promise.all([getCommunitySettings(), getMenuItems()])
        setSettings(s)
        setLogoUrl(s.logo_url || '')
        setAppName(s.app_name || '')
        setAppSubtitle(s.app_subtitle || '')
        setDashboardTitle(s.dashboard_title || '')
        setDashboardSubtitle(s.dashboard_subtitle || '')
        setMenuItemsState(items)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleSaveSettings = async () => {
    await upsertCommunitySettings({
      logo_url: logoUrl.trim(),
      app_name: appName.trim(),
      app_subtitle: appSubtitle.trim(),
      dashboard_title: dashboardTitle.trim(),
      dashboard_subtitle: dashboardSubtitle.trim(),
    })

    // lightweight immediate UI feedback
    setSettings((prev) => ({
      ...prev,
      logo_url: logoUrl.trim(),
      app_name: appName.trim(),
      app_subtitle: appSubtitle.trim(),
      dashboard_title: dashboardTitle.trim(),
      dashboard_subtitle: dashboardSubtitle.trim(),
    }))
  }

  const startEditMenu = (item: MenuItem) => {
    setEditingMenuId(item.id)
    setMenuForm({
      id: item.id,
      label: item.label,
      path: item.path,
      icon_key: String(item.icon_key || 'layout_dashboard'),
      is_active: item.is_active,
    })
  }

  const cancelEdit = () => {
    setEditingMenuId(null)
    setMenuForm(emptyMenuForm)
  }

  const handleSubmitMenu = async () => {
    if (!menuForm.label.trim() || !menuForm.path.trim()) return

    const payload = {
      id: editingMenuId || menuForm.id,
      label: menuForm.label.trim(),
      path: menuForm.path.trim(),
      icon_key: menuForm.icon_key,
      is_active: menuForm.is_active,
    }

    if (editingMenuId) {
      await upsertMenuItem(payload as any)
    } else {
      await createMenuItem({
        label: payload.label,
        path: payload.path,
        icon_key: payload.icon_key,
        is_active: payload.is_active,
      })
    }

    await reloadMenuItems()
    cancelEdit()
  }

  const handleToggleActive = async (item: MenuItem, next: boolean) => {
    await setMenuItemActive(item.id, next)
    await reloadMenuItems()
  }

  const handleNewMenu = () => {
    cancelEdit()
    setMenuForm((prev) => ({ ...prev, is_active: true }))
  }

  if (loading) {
    return (
      <div className="relative mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="h-8 w-56 animate-pulse rounded bg-wood-700/30" />
      </div>
    )
  }

  return (
    <div className="relative mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold tracking--tight text-silver-100 sm:text-3xl">
          Topluluk Ayarları
        </h1>
        <p className="mt-1 text-sm text-silver-600">Logo, başlıklar ve sol menü öğelerini yönet.</p>
      </div>

      {/* Settings form */}
      <div className="mb-8 rounded-2xl border border-wood-600/20 bg-wood-700/20 p-5">
        <h2 className="text-sm font-semibold text-silver-100 mb-4">Uygulama Ayarları</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-silver-600 mb-2">Logo URL</label>
            <input
              className="w-full rounded-xl border border-white/[0.10] bg-coal-800/30 px-3 py-2 text-sm text-silver-100 outline-none focus:border-ice-400/50"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-silver-600 mb-2">App Name</label>
            <input
              className="w-full rounded-xl border border-white/[0.10] bg-coal-800/30 px-3 py-2 text-sm text-silver-100 outline-none focus:border-ice-400/50"
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              placeholder="Topluluk"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-silver-600 mb-2">App Subtitle</label>
            <input
              className="w-full rounded-xl border border-white/[0.10] bg-coal-800/30 px-3 py-2 text-sm text-silver-100 outline-none focus:border-ice-400/50"
              value={appSubtitle}
              onChange={(e) => setAppSubtitle(e.target.value)}
              placeholder="Görev Yönetimi"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-silver-600 mb-2">Dashboard Title</label>
            <input
              className="w-full rounded-xl border border-white/[0.10] bg-coal-800/30 px-3 py-2 text-sm text-silver-100 outline-none focus:border-ice-400/50"
              value={dashboardTitle}
              onChange={(e) => setDashboardTitle(e.target.value)}
              placeholder="Dashboard"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-silver-600 mb-2">Dashboard Subtitle</label>
            <input
              className="w-full rounded-xl border border-white/[0.10] bg-coal-800/30 px-3 py-2 text-sm text-silver-100 outline-none focus:border-ice-400/50"
              value={dashboardSubtitle}
              onChange={(e) => setDashboardSubtitle(e.target.value)}
              placeholder="Topluluk görev yönetimine genel bakış"
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            onClick={handleSaveSettings}
            className="inline-flex items-center gap-2 rounded-xl bg-ice-400/20 px-4 py-2 text-sm font-medium text-ice-100 hover:bg-ice-400/25 border border-ice-400/30"
          >
            <Save className="h-4 w-4" />
            Kaydet
          </button>
        </div>
      </div>

      {/* Menu section */}
      <div className="rounded-2xl border border-wood-600/20 bg-wood-700/20 p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-sm font-semibold text-silver-100">Menü Öğeleri</h2>
          <button
            onClick={handleNewMenu}
            className="inline-flex items-center gap-2 rounded-xl bg-coal-800/40 px-3 py-2 text-sm font-medium text-silver-100 hover:bg-coal-800/60 border border-white/[0.10]"
          >
            <Plus className="h-4 w-4" />
            Yeni
          </button>
        </div>

        <div className="mb-5 rounded-xl border border-white/[0.08] bg-coal-800/20 p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-1">
              <label className="block text-xs font-medium text-silver-600 mb-2">Label</label>
              <input
                className="w-full rounded-xl border border-white/[0.10] bg-coal-800/30 px-3 py-2 text-sm text-silver-100 outline-none focus:border-ice-400/50"
                value={menuForm.label}
                onChange={(e) => setMenuForm((p) => ({ ...p, label: e.target.value }))}
              />
            </div>
            <div className="md:col-span-1">
              <label className="block text-xs font-medium text-silver-600 mb-2">Path</label>
              <input
                className="w-full rounded-xl border border-white/[0.10] bg-coal-800/30 px-3 py-2 text-sm text-silver-100 outline-none focus:border-ice-400/50"
                value={menuForm.path}
                onChange={(e) => setMenuForm((p) => ({ ...p, path: e.target.value }))}
                placeholder="/dashboard"
              />
            </div>
            <div className="md:col-span-1">
              <label className="block text-xs font-medium text-silver-600 mb-2">Icon Key</label>
              <select
                className="w-full rounded-xl border border-white/[0.10] bg-coal-800/30 px-3 py-2 text-sm text-silver-100 outline-none focus:border-ice-400/50"
                value={menuForm.icon_key}
                onChange={(e) => setMenuForm((p) => ({ ...p, icon_key: e.target.value }))}
              >
                {iconOptions.map((opt) => (
                  <option key={opt.key} value={opt.key}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-1 flex items-end">
              <div className="w-full">
                <label className="block text-xs font-medium text-silver-600 mb-2">Aktif</label>
                <select
                  className="w-full rounded-xl border border-white/[0.10] bg-coal-800/30 px-3 py-2 text-sm text-silver-100 outline-none focus:border-ice-400/50"
                  value={menuForm.is_active ? 'true' : 'false'}
                  onChange={(e) => setMenuForm((p) => ({ ...p, is_active: e.target.value === 'true' }))}
                >
                  <option value="true">Aktif</option>
                  <option value="false">Pasif</option>
                </select>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-end gap-2">
            {editingMenuId && (
              <button
                onClick={cancelEdit}
                className="rounded-xl border border-white/[0.10] bg-coal-800/30 px-4 py-2 text-sm font-medium text-silver-100 hover:bg-coal-800/50"
              >
                İptal
              </button>
            )}
            <button
              onClick={handleSubmitMenu}
              disabled={!menuForm.label.trim() || !menuForm.path.trim()}
              className="inline-flex items-center gap-2 rounded-xl bg-ice-400/20 px-4 py-2 text-sm font-medium text-ice-100 hover:bg-ice-400/25 border border-ice-400/30 disabled:opacity-50"
            >
              <Edit3 className="h-4 w-4" />
              {editingMenuId ? 'Güncelle' : 'Ekle'}
            </button>
          </div>
        </div>

        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-silver-600">
                <th className="py-2">Label</th>
                <th className="py-2">Path</th>
                <th className="py-2">Icon</th>
                <th className="py-2">Aktif</th>
                <th className="py-2 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {menuItems.map((item) => (
                <tr key={item.id} className="border-t border-white/[0.06]">
                  <td className="py-3">
                    <span className="text-silver-100">{item.label}</span>
                  </td>
                  <td className="py-3 text-silver-400">{item.path}</td>
                  <td className="py-3 text-silver-400">{String(item.icon_key)}</td>
                  <td className="py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium border ${
                        item.is_active
                          ? 'bg-emerald-400/10 border-emerald-400/30 text-emerald-200'
                          : 'bg-wood-400/10 border-wood-400/30 text-silver-300'
                      }`}
                    >
                      {item.is_active ? 'Aktif' : 'Pasif'}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <div className="inline-flex items-center gap-2">
                      <button
                        onClick={() => startEditMenu(item)}
                        className="rounded-xl border border-white/[0.10] bg-coal-800/30 px-3 py-1.5 text-xs font-medium text-silver-100 hover:bg-coal-800/50"
                      >
                        <Edit3 className="inline h-3.5 w-3.5 mr-2" />
                        Düzenle
                      </button>
                      <button
                        onClick={() => handleToggleActive(item, !item.is_active)}
                        className="rounded-xl border border-white/[0.10] bg-coal-800/30 px-3 py-1.5 text-xs font-medium text-silver-100 hover:bg-coal-800/50"
                      >
                        {item.is_active ? (
                          <>
                            <EyeOff className="inline h-3.5 w-3.5 mr-2" />
                            Pasife çek
                          </>
                        ) : (
                          <>Aktif et</>
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

