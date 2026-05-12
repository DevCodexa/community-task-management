import React, { useEffect, useMemo, useState } from 'react';
import { X, Save, Loader2, AlertCircle, Megaphone, Link as LinkIcon } from 'lucide-react';
import type { FullAnnouncement } from '../../types/announcement';
import type { EventType } from '../../types/event';
import { EVENT_TYPE_VALUES, EVENT_TYPE_LABELS } from '../../types/event';
import { MultiSelectInput } from '../ui/MultiSelectInput';
import type { FullMember } from '../../types/member';
import { getMembers } from '../../lib/supabaseMembers';
import { createAnnouncement, updateAnnouncement } from '../../lib/supabaseAnnouncements';

interface AnnouncementFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  announcement?: FullAnnouncement | null;
  onSuccess: () => void;
}

// UI choice: support "All Members" using a dedicated boolean.
// When enabled, memberIds will be empty but "all members" intent will be passed.
// DB script supports announcement_members, but sending mail needs special handling.
// Current service ignores empty memberIds -> we will treat it as "all members" by sending explicit IDs at service level.
// To keep changes small and production-safe, we resolve all member IDs client-side when "All Members" is enabled.

export const AnnouncementFormModal: React.FC<AnnouncementFormModalProps> = ({
  isOpen,
  onClose,
  announcement,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState('');

  const [members, setMembers] = useState<FullMember[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [allMembers, setAllMembers] = useState(false);

  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    link: string;
    type: EventType;
  }>({
    title: '',
    description: '',
    link: '',
    type: 'Other',
  });

  useEffect(() => {
    if (!isOpen) return;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const membersResp = (await getMembers({ limit: 250 })) as any;
        setMembers(membersResp.data || []);

        if (announcement) {
          setFormData({
            title: announcement.title,
            description: announcement.description,
            link: announcement.link || '',
            type: announcement.type,
          });

          // selected members for editing: we don't have member IDs in FullAnnouncement.
          // So we rely on service update path to handle memberIds passed from UI.
          setSelectedMemberIds([]);
          setAllMembers(false);
        } else {
          setFormData({ title: '', description: '', link: '', type: 'Other' });
          setSelectedMemberIds([]);
          setAllMembers(false);
        }
      } catch (e: any) {
        setError(e?.message || 'Üyeler yüklenemedi');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [isOpen, announcement]);

  const memberOptions = useMemo(() => {
    return members.map((m) => ({ id: m.id, name: m.name }));
  }, [members]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const title = formData.title.trim();
    if (!title) {
      setError('Başlık zorunludur');
      return;
    }

    if (formData.description.length > 5000) {
      setError('Açıklama çok uzun');
      return;
    }

    if (!formData.type) {
      setError('Tür zorunludur');
      return;
    }

    // Resolve member IDs
    const memberIdsToSave = allMembers
      ? members.map((m) => m.id)
      : selectedMemberIds;

    // Avoid sending huge payloads; still fine for <250.
    if (!allMembers && memberIdsToSave.length === 0) {
      setError('En az 1 üye seçmelisin (veya "Tüm Üyeler" seç)');
      return;
    }

    setSubmitLoading(true);
    try {
      if (announcement) {
        await updateAnnouncement(announcement.id, {
          title: formData.title,
          description: formData.description,
          link: formData.link,
          type: formData.type,
          memberIds: memberIdsToSave,
        } as any);
      } else {
        await createAnnouncement({
          title: formData.title,
          description: formData.description,
          link: formData.link,
          type: formData.type,
          memberIds: memberIdsToSave,
        } as any);
      }

      onSuccess();
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Duyuru kaydedilemedi');
    } finally {
      setSubmitLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-xl" onClick={onClose} />

      <div className="relative w-full max-w-2xl mx-auto rounded-3xl border border-white/10 bg-gradient-to-b from-coal-800/95 via-coal-900/90 to-coal-800/95 shadow-3xl backdrop-blur-3xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-coal-900/50 border-b border-white/5 p-6 backdrop-blur-xl z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-2xl bg-gradient-to-br from-ice-500/10 to-ice-500/5 border border-ice-500/20">
                <Megaphone className="h-5 w-5 text-ice-400" />
              </div>
              <div>
                <h2 className="font-display text-2xl font-bold text-silver-100">
                  {announcement ? 'Duyuru Düzenle' : 'Yeni Duyuru'}
                </h2>
                <p className="text-sm text-silver-500">Üyeleri seç ve duyuruyu oluştur</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-silver-400 hover:text-silver-200 hover:bg-white/10 transition-all"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-silver-300 mb-2">Duyuru Başlığı *</label>
            <input
              value={formData.title}
              onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
              required
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/20 text-silver-100 placeholder-silver-600 focus:ring-2 focus:ring-ice-500/30 focus:border-white/50 transition-all"
              placeholder="Duyuru başlığı..."
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-silver-300 mb-2">Açıklama</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
              className="w-full min-h-[120px] px-4 py-3 rounded-xl bg-white/5 border border-white/20 text-silver-100 placeholder-silver-600 focus:ring-2 focus:ring-ice-500/30 focus:border-white/50 transition-all resize-vertical"
              placeholder="Duyuru detayları..."
            />
          </div>

          {/* Grid: Type + Link */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-silver-400 uppercase tracking-wider mb-2">Tür</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData((p) => ({ ...p, type: e.target.value as EventType }))}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/20 text-silver-100 focus:ring-2 focus:ring-ice-500/30 focus:border-white/50 transition-all"
              >
                {EVENT_TYPE_VALUES.map((t) => (
                  <option key={t} value={t}>
                    {EVENT_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-silver-300 mb-2 flex items-center gap-2">
                <LinkIcon className="h-4 w-4 text-ice-400" />
                Dış Link (opsiyonel)
              </label>
              <input
                type="url"
                value={formData.link}
                onChange={(e) => setFormData((p) => ({ ...p, link: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/20 text-silver-100 placeholder-silver-600 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition-all"
                placeholder="https://..."
              />
            </div>
          </div>

          {/* Members */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <label className="block text-sm font-semibold text-silver-300">Member Seçimi *</label>

              <button
                type="button"
                onClick={() => {
                  setAllMembers((v) => {
                    const next = !v;
                    if (next) setSelectedMemberIds([]);
                    return next;
                  });
                }}
                className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
                  allMembers
                    ? 'bg-ice-500/15 text-ice-200 border-ice-500/30'
                    : 'bg-white/5 text-silver-400 border-white/10 hover:bg-white/10 hover:text-silver-200'
                }`}
              >
                Tüm Üyeler
              </button>
            </div>

            <MultiSelectInput
              label="Üyeler"
              options={memberOptions}
              selectedIds={selectedMemberIds}
              onChange={(ids) => {
                setAllMembers(false);
                setSelectedMemberIds(ids);
              }}
              placeholder="Üye ara..."
              className={allMembers ? 'opacity-50 pointer-events-none' : ''}
            />
          </div>

          <div className="flex items-center gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 rounded-xl text-sm font-semibold text-silver-400 hover:text-silver-200 hover:bg-white/10 transition-all border border-white/10"
              disabled={submitLoading}
            >
              İptal
            </button>

            <button
              type="submit"
              disabled={submitLoading || loading}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-ice-500 to-blue-500 text-white hover:from-ice-600 hover:to-blue-600 shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Kaydediliyor...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Kaydet
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

