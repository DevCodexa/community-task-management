import React, { useEffect, useMemo, useState } from 'react';
import { X, Search, UserCheck, Building2, Trash2,  } from 'lucide-react';
import { Input } from '../ui/Input';
import { useTheme } from '../../context/ThemeContext';
import { sendEmail } from '../../lib/resend';
import { supabase } from '../../lib/supabase';
import { OrgArea, getAreaMembersByAreaId, createArea, setAreaMembers, updateArea, deleteArea } from '../../lib/supabaseOrgHierarchy';
import { searchMembers } from '../../lib/supabaseMembers';

type MemberPick = {
  id: string;
  name: string;
  email: string;
  avatar: string;
};

interface AreaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  departmentId: string;
  area?: OrgArea | null;
}

type Mode = 'create' | 'edit';

export const AreaModal: React.FC<AreaModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  departmentId,
  area,
}) => {
  const { isIceBlue } = useTheme();

  const mode: Mode = area?.id ? 'edit' : 'create';

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  // leader selection (single)
  const [leaderQuery, setLeaderQuery] = useState('');
  const [leaderCandidates, setLeaderCandidates] = useState<MemberPick[]>([]);
  const [selectedLeaderId, setSelectedLeaderId] = useState<string | null>(null);
  const [leaderLoading, setLeaderLoading] = useState(false);

  // team selection (multi)
  const [teamQuery, setTeamQuery] = useState('');
  const [teamCandidates, setTeamCandidates] = useState<MemberPick[]>([]);
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allSelectedIds = useMemo(() => {
    const ids = new Set<string>();
    if (selectedLeaderId) ids.add(selectedLeaderId);
    selectedTeamIds.forEach((id) => ids.add(id));
    return Array.from(ids);
  }, [selectedLeaderId, selectedTeamIds]);

  const fetchLeaderCandidates = async (q: string) => {
    const query = q.trim();
    if (!query || query.length < 2) {
      setLeaderCandidates([]);
      return;
    }
    setLeaderLoading(true);
    setError(null);
    try {
      const res = await searchMembers(query);
      const mapped: MemberPick[] = (res || []).map((m: any) => ({
        id: m.id,
        name: m.name,
        email: m.email,
        avatar: m.avatar,
      }));
      setLeaderCandidates(mapped);
    } catch (e: any) {
      setError(e?.message || 'Lider adayları yüklenemedi.');
    } finally {
      setLeaderLoading(false);
    }
  };

  const fetchTeamCandidates = async (q: string) => {
    const query = q.trim();
    if (!query || query.length < 2) {
      setTeamCandidates([]);
      return;
    }
    setTeamLoading(true);
    setError(null);
    try {
      const res = await searchMembers(query);
      const mapped: MemberPick[] = (res || []).map((m: any) => ({
        id: m.id,
        name: m.name,
        email: m.email,
        avatar: m.avatar,
      }));
      setTeamCandidates(mapped);
    } catch (e: any) {
      setError(e?.message || 'Ekip adayları yüklenemedi.');
    } finally {
      setTeamLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    setName('');
    setDescription('');

    setLeaderQuery('');
    setLeaderCandidates([]);
    setSelectedLeaderId(null);
    setLeaderLoading(false);

    setTeamQuery('');
    setTeamCandidates([]);
    setSelectedTeamIds([]);
    setTeamLoading(false);

    setSubmitting(false);
    setError(null);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (mode === 'edit' && area) {
      setName(area.name);
      setDescription(area.description || '');

      // area_leader already populated by getAreasByDepartmentId
      setSelectedLeaderId(area.area_leader_id);

      // members will be fetched
      (async () => {
        try {
          const members = await getAreaMembersByAreaId(area.id);
          const leaderMember = members.find((m) => m.role === 'LEADER');
          if (leaderMember) setSelectedLeaderId(leaderMember.user_id);

          const teamIds = members
            .filter((m) => m.role === 'TEAM_MEMBER')
            .map((m) => m.user_id);
          setSelectedTeamIds(teamIds);
        } catch (e: any) {
          setError(e?.message || 'Alan üyeleri yüklenemedi.');
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, mode, area?.id]);

  useEffect(() => {
    if (!isOpen) return;
    fetchLeaderCandidates(leaderQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leaderQuery, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    fetchTeamCandidates(teamQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamQuery, isOpen]);

  const handleToggleTeamMember = (memberId: string) => {
    // team list should not contain leaderId explicitly (we still keep it separate)
    if (selectedLeaderId === memberId) return;

    setSelectedTeamIds((prev) => {
      if (prev.includes(memberId)) return prev.filter((id) => id !== memberId);
      return [...prev, memberId];
    });
  };

  const handleRemoveTeamChip = (memberId: string) => {
    if (selectedLeaderId === memberId) return;
    setSelectedTeamIds((prev) => prev.filter((id) => id !== memberId));
  };

  const sendAreaEmails = async (leaderId: string, teamIds: string[]) => {
    // Collect emails (leader + team)
    const ids = [leaderId, ...teamIds].filter(Boolean);

    // ensure we have member emails; best-effort via candidates + fallback query
    const uniqueIds = Array.from(new Set(ids));
    const memberData: Array<{ id: string; email: string; name: string }> = [];

    // use supabase directly to ensure emails even if candidates are empty
    const { data: users, error } = await supabase
      .from('members')
      .select('id,name,email')
      .in('id', uniqueIds);

    if (error) throw new Error(error.message);

    (users || []).forEach((u: any) => {
      if (u?.email) memberData.push({ id: u.id, email: u.email, name: u.name });
    });

    const leader = memberData.find((m) => m.id === leaderId) || memberData[0];

    if (leader?.email) {
      const to = leader.email;
      const subject = `🎯 Yeni Alan Eklemesi: ${name}`;
      const html = `
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Yeni Alan Bildirimi</title>
</head>
<body style="margin:0; padding:0; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background:#0f0f1a;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f1a; padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px; background:#1a1a2e; border-radius:16px; overflow:hidden;">
          <tr>
            <td style="padding:26px 30px; text-align:center; background:linear-gradient(135deg, #0D8ABC 0%, #0a6a8a 100%);">
              <h1 style="margin:0; font-size:20px; color:#fff;">🏷️ Yeni Alan</h1>
              <p style="margin:8px 0 0 0; font-size:13px; color:rgba(255,255,255,0.85);">Zincir Atarlı Topluluk</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 30px;">
              <p style="margin:0 0 14px 0; color:#e0e0e0; font-size:15px; line-height:1.6;">
                Merhaba <strong style="color:#0D8ABC;">${leader.name}</strong>,
              </p>
              <p style="margin:0 0 18px 0; color:#a0a0a0; font-size:14px; line-height:1.7;">
                <strong>${name}</strong> adlı yeni alanın lideri/ekibi olarak dahil edildiniz.
              </p>
              <p style="margin:0; color:#a0a0a0; font-size:14px; line-height:1.7;">
                Alanları yönetmek için panel üzerinden devam edebilirsiniz.
              </p>
              <div style="margin:22px 0;">
                <a href="https://community-tasks.vercel.app" style="display:inline-block; text-decoration:none; background:#0D8ABC; color:#ffffff; padding:12px 18px; border-radius:10px; font-weight:700; font-size:14px;">
                  Alanları Görüntüle →
                </a>
              </div>
              <p style="margin:18px 0 0 0; color:#64748b; font-size:12px; line-height:1.6;">
                Bu e-posta otomatik olarak gönderilmiştir. Lütfen bu e-posta adresine yanıt vermeyin.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `.trim();

      await sendEmail(to, subject, html);
    }

    // send to all team members too (including leader if you want; we'll avoid double sending)
    for (const member of memberData) {
      if (!member.email) continue;
      if (member.id === leaderId) continue;

      const subjectMember = `🎯 Yeni Alana Dahil Edildiniz: ${name}`;
      const htmlMember = `
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Yeni Alan Bildirimi</title>
</head>
<body style="margin:0; padding:0; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background:#0f0f1a;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f1a; padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px; background:#1a1a2e; border-radius:16px; overflow:hidden;">
          <tr>
            <td style="padding:26px 30px; text-align:center; background:linear-gradient(135deg, #0D8ABC 0%, #0a6a8a 100%);">
              <h1 style="margin:0; font-size:20px; color:#fff;">📌 Yeni Alan</h1>
              <p style="margin:8px 0 0 0; font-size:13px; color:rgba(255,255,255,0.85);">Zincir Atarlı Topluluk</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 30px;">
              <p style="margin:0 0 14px 0; color:#e0e0e0; font-size:15px; line-height:1.6;">
                Merhaba <strong style="color:#0D8ABC;">${member.name}</strong>,
              </p>
              <p style="margin:0 0 18px 0; color:#a0a0a0; font-size:14px; line-height:1.7;">
                <strong>${name}</strong> adlı alana ekip üyesi olarak dahil edildiniz.
              </p>
              <div style="margin:22px 0;">
                <a href="https://community-tasks.vercel.app" style="display:inline-block; text-decoration:none; background:#0D8ABC; color:#ffffff; padding:12px 18px; border-radius:10px; font-weight:700; font-size:14px;">
                  Alanları Görüntüle →
                </a>
              </div>
              <p style="margin:18px 0 0 0; color:#64748b; font-size:12px; line-height:1.6;">
                Bu e-posta otomatik olarak gönderilmiştir. Lütfen bu e-posta adresine yanıt vermeyin.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `.trim();

      await sendEmail(member.email, subjectMember, htmlMember);
    }
  };

  const handleSubmit = async () => {
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Ad alanı zorunludur.');
      return;
    }
    if (!departmentId) {
      setError('Bölüm ID bulunamadı.');
      return;
    }
    if (!selectedLeaderId) {
      setError('Alan Lideri seçmelisiniz.');
      return;
    }

    const leaderId = selectedLeaderId;
    const teamIds = selectedTeamIds;

    setSubmitting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) {
        setError('Oturum gerekli: alan işlemleri için giriş yapmalısınız.');
        return;
      }

      if (mode === 'create') {
        const created = await createArea({
          department_id: departmentId,
          name: trimmedName,
          description: description.trim() ? description.trim() : null,
          area_leader_id: leaderId,
        });

        const memberIdsForRelation = Array.from(new Set([leaderId, ...teamIds]));

        await setAreaMembers({
          area_id: created.id,
          memberIds: memberIdsForRelation,
          leaderId,
        });

        await sendAreaEmails(leaderId, teamIds);
      } else {
        if (!area?.id) throw new Error('Güncellenecek alan bulunamadı.');

        await updateArea({
          area_id: area.id,
          name: trimmedName,
          description: description.trim() ? description.trim() : null,
          area_leader_id: leaderId,
        });

        const memberIdsForRelation = Array.from(new Set([leaderId, ...teamIds]));

        await setAreaMembers({
          area_id: area.id,
          memberIds: memberIdsForRelation,
          leaderId,
        });

        await sendAreaEmails(leaderId, teamIds);
      }

      onSuccess();
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Alan kaydedilemedi.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (mode !== 'edit' || !area?.id) return;
    const ok = window.confirm(`"${area.name}" alanını silmek istediğinize emin misiniz?`);
    if (!ok) return;

    setSubmitting(true);
    setError(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) {
        setError('Oturum gerekli: silme işlemi için giriş yapmalısınız.');
        return;
      }

      await deleteArea(area.id);
      onSuccess();
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Alan silinemedi.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-xl" onClick={onClose} />

      <div
        className="relative w-full max-w-2xl rounded-3xl border border-white/10 bg-coal-900/95 shadow-3xl overflow-hidden max-h-[calc(100vh-4rem)]"
        style={{ background: isIceBlue ? 'rgba(255,255,255,0.92)' : undefined }}
      >
        <div className="p-6 border-b border-white/10 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-ice-500/10 border border-ice-500/20">
                <Building2 className="h-4 w-4 text-ice-400" />
              </span>
              <h2 className="text-lg font-bold text-silver-100">{mode === 'edit' ? 'Alan Düzenle' : 'Alan Ekle'}</h2>
            </div>
            <p className="mt-1 text-sm text-silver-600">Lider ve ekip üyelerini atayın.</p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl border border-white/10 text-silver-400 hover:text-silver-200 hover:bg-white/[0.05] transition-colors"
            aria-label="Kapat"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(100vh-20rem)]">
          {error && (
            <div className="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-200">
              {error}
            </div>
          )}

          <div className="space-y-5">
            <Input
              label="Alan Adı"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Örn: Yazılım"
            />

            <Input
              label="Açıklama"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Kısa açıklama (opsiyonel)"
            />

            {/* Leader */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-silver-500">Alan Lideri</p>
                  <p className="text-sm text-silver-400 mt-1">İsim veya e-posta ile ara.</p>
                </div>
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs border border-ice-500/20 bg-ice-500/10 text-ice-300">
                  <UserCheck className="h-3.5 w-3.5" />
                  Tekli seçim
                </span>
              </div>

              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-silver-600" />
                <input
                  value={leaderQuery}
                  onChange={(e) => setLeaderQuery(e.target.value)}
                  placeholder="Lider ara..."
                  className="w-full pl-10 pr-3 py-2.5 rounded-lg bg-white/[0.03] border border-white/10 text-silver-100 text-sm placeholder:text-silver-700 focus:outline-none focus:border-ice-500/50 focus:ring-1 focus:ring-ice-500/20 transition-all"
                />
              </div>

              {leaderLoading ? (
                <p className="text-sm text-silver-400 py-2">Lider adayları aranıyor...</p>
              ) : (
                <div className="max-h-52 overflow-auto pr-1">
                  {leaderCandidates.length === 0 ? (
                    <p className="text-sm text-silver-600 py-2">Lider adayı bulunamadı.</p>
                  ) : (
                    <div className="space-y-2">
                      {leaderCandidates.map((m) => {
                        const active = m.id === selectedLeaderId;
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => {
                              setSelectedLeaderId(m.id);
                            }}
                            className={`w-full text-left rounded-xl border px-3 py-2 flex items-center gap-3 transition-all ${
                              active
                                ? 'bg-ice-500/15 border-ice-500/30'
                                : 'bg-white/[0.02] border-white/10 hover:bg-white/[0.04]'
                            }`}
                          >
                            <div className="h-9 w-9 rounded-full border border-white/10 bg-white/[0.03] overflow-hidden flex items-center justify-center shrink-0">
                              {m.avatar ? (
                                <img src={m.avatar} alt={m.name} className="h-full w-full object-cover" />
                              ) : (
                                <span className="text-xs font-bold text-silver-600">{m.name?.[0]?.toUpperCase() ?? '—'}</span>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-silver-100 truncate">{m.name}</p>
                              <p className="text-xs text-silver-600 truncate">{m.email}</p>
                            </div>
                            <div className="shrink-0">
                              {active ? (
                                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-ice-500/20 border border-ice-500/30 text-ice-300">
                                  ✓
                                </span>
                              ) : (
                                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 text-silver-500">
                                  +
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Team */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-silver-500">Ekip Üyeleri</p>
                  <p className="text-sm text-silver-400 mt-1">Çoklu seçim (lider dahil otomatik).</p>
                </div>
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs border border-ice-500/20 bg-ice-500/10 text-ice-300">
                  <UserCheck className="h-3.5 w-3.5" />
                  N kişi
                </span>
              </div>

              {/* chips summary */}
              <div className="mb-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-silver-500 mb-2">Seçilenler</div>
                <div className="flex flex-wrap gap-2">
                  {allSelectedIds.length === 0 ? (
                    <span className="text-sm text-silver-600">Henüz seçim yok.</span>
                  ) : (
                    allSelectedIds.map((id) => {
                      const candidate = [...leaderCandidates, ...teamCandidates].find((m) => m.id === id);
                      const nameText = candidate?.name || (id === selectedLeaderId ? 'Lider' : 'Üye');
                      return (
                        <span
                          key={id}
                          className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-white/[0.03] border border-white/10 text-silver-200"
                        >
                          {nameText}
                          {id !== selectedLeaderId && (
                            <button
                              type="button"
                              onClick={() => handleRemoveTeamChip(id)}
                              className="text-silver-400 hover:text-silver-200"
                              aria-label={`Remove ${nameText}`}
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </span>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-silver-600" />
                <input
                  value={teamQuery}
                  onChange={(e) => setTeamQuery(e.target.value)}
                  placeholder="Ekip üyesi ara..."
                  className="w-full pl-10 pr-3 py-2.5 rounded-lg bg-white/[0.03] border border-white/10 text-silver-100 text-sm placeholder:text-silver-700 focus:outline-none focus:border-ice-500/50 focus:ring-1 focus:ring-ice-500/20 transition-all"
                />
              </div>

              {teamLoading ? (
                <p className="text-sm text-silver-400 py-2">Ekip üyeleri aranıyor...</p>
              ) : (
                <div className="max-h-52 overflow-auto pr-1">
                  {teamCandidates.length === 0 ? (
                    <p className="text-sm text-silver-600 py-2">Ekip adayı bulunamadı.</p>
                  ) : (
                    <div className="space-y-2">
                      {teamCandidates.map((m) => {
                        const isLeader = m.id === selectedLeaderId;
                        const active = selectedTeamIds.includes(m.id);
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => {
                              if (isLeader) return;
                              handleToggleTeamMember(m.id);
                            }}
                            className={`w-full text-left rounded-xl border px-3 py-2 flex items-center gap-3 transition-all ${
                              active
                                ? 'bg-ice-500/15 border-ice-500/30'
                                : 'bg-white/[0.02] border-white/10 hover:bg-white/[0.04]'
                            }`}
                            disabled={isLeader}
                          >
                            <div className="h-9 w-9 rounded-full border border-white/10 bg-white/[0.03] overflow-hidden flex items-center justify-center shrink-0">
                              {m.avatar ? (
                                <img src={m.avatar} alt={m.name} className="h-full w-full object-cover" />
                              ) : (
                                <span className="text-xs font-bold text-silver-600">{m.name?.[0]?.toUpperCase() ?? '—'}</span>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-silver-100 truncate">{m.name}</p>
                              <p className="text-xs text-silver-600 truncate">{m.email}</p>
                            </div>
                            <div className="shrink-0">
                              {isLeader ? (
                                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white/[0.03] border border-white/10 text-silver-500">
                                  •
                                </span>
                              ) : active ? (
                                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-ice-500/20 border border-ice-500/30 text-ice-300">
                                  ✓
                                </span>
                              ) : (
                                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 text-silver-500">
                                  +
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-6">
            {mode === 'edit' && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={submitting}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-500/20 bg-red-500/10 text-red-200 hover:bg-red-500/15 transition-all disabled:opacity-60"
              >
                <Trash2 className="h-4 w-4" />
                Sil
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-white/20 text-silver-400 hover:bg-white/10 transition-all text-sm font-medium"
              disabled={submitting}
            >
              Vazgeç
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-ice-500/20 border border-ice-500/20 text-ice-300 hover:bg-ice-500/25 hover:border-ice-500/30 transition-all text-sm font-semibold disabled:opacity-60"
            >
              {submitting ? 'Kaydediliyor...' : mode === 'edit' ? 'Güncelle' : 'Kaydet'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

