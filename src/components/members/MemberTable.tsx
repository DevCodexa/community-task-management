import React from 'react';
import { Pencil, Trash2, Eye, UserX } from 'lucide-react';
import { FullMember } from '../../types/member';
import { useTheme } from '../../context/ThemeContext';

interface MemberTableProps {
  members: FullMember[];
  onEdit: (member: FullMember) => void;
  onDelete: (id: string) => void;
  onDetail: (member: FullMember) => void;
}

const getTaskBadgeStyle = (active: number, total: number) => {
  if (active >= total) {
    return 'bg-[#ff6b6b]/10 text-[#ff6b6b] ring-1 ring-[#ff6b6b]/25';
  }
  if (active === total - 1) {
    return 'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20';
  }
  return 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20';
};

export const MemberTable: React.FC<MemberTableProps> = ({
  members,
  onEdit,
  onDelete,
  onDetail,
}) => {
  const { isIceBlue } = useTheme()

  const theadClass = isIceBlue 
    ? 'border-b border-iceBlue-200 text-iceBlue-700'
    : 'border-b border-white/[0.08] text-silver-600'
  
  const rowBgClass = (index: number) => {
    if (isIceBlue) {
      return index % 2 === 0 ? 'bg-white' : 'bg-iceBlue-50'
    }
    return 'group hover:bg-white/[0.015]'
  }
  
const textPrimaryClass = isIceBlue ? 'text-slate-700' : 'text-silver-100'
  const textSecondaryClass = isIceBlue ? 'text-slate-600' : 'text-silver-300'
  const textMutedClass = isIceBlue ? 'text-slate-500' : 'text-silver-700'

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className={theadClass}>
            <th className="pb-4 pt-2 pl-4 text-[11px] font-semibold uppercase tracking-wider">
              Üye
            </th>
            <th className="pb-4 pt-2 text-[11px] font-semibold uppercase tracking-wider">
              İletişim
            </th>
            <th className="pb-4 pt-2 text-[11px] font-semibold uppercase tracking-wider">
              Görev Durumu
            </th>
            <th className="pb-4 pt-2 text-[11px] font-semibold uppercase tracking-wider">
              Firma / Biyografi
            </th>
            <th className="pb-4 pt-2 pr-4 text-[11px] font-semibold uppercase tracking-wider text-right">
              İşlemler
            </th>
          </tr>
        </thead>
        <tbody className={isIceBlue ? '' : 'divide-y divide-white/[0.03]'}>
          {members.map((member, index) => (
            <tr
              key={member.id}
              className={`transition-all duration-200 ${rowBgClass(index)}`}
            >
              {/* Profil & Ünvan */}
              <td className="py-5 pl-4">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <img
                      src={member.avatar}
                      alt={member.name}
                      className="h-11 w-11 rounded-full object-cover ring-2 ring-white/[0.06] group-hover:ring-white/[0.12] transition-all"
                    />
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-coal-800 ${
                        member.active_tasks < member.total_tasks
                          ? 'bg-emerald-400'
                          : 'bg-[#ff6b6b]'
                      }`}
                    />
</div>
                  <div className="min-w-0">
                    <p className={`text-sm font-bold tracking-[-0.01em] ${textPrimaryClass}`}>
                      {member.name}
                    </p>
                    <p className={`text-[11px] mt-0.5 font-normal truncate ${textMutedClass}`}>
                      {member.job_title || 'Topluluk Üyesi'}
                    </p>
                    <p className={`text-[11px] mt-0.5 font-normal truncate ${textMutedClass}`}>
                      {member.comm_title || 'Topluluk Üyesi'} · {member.system_role}
                    </p>
                  </div>
                </div>
              </td>

{/* İletişim */}
              <td className="py-5">
                <div className="flex flex-col gap-1.5">
                  <span className={`text-[13px] font-medium ${textSecondaryClass}`}>
                    {member.email}
                  </span>
                  <span className={`text-[11px] font-normal ${textMutedClass}`}>
                    {member.phone || '—'}
                  </span>
                </div>
              </td>

              {/* Görev Durumu */}
              <td className="py-5">
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold ${getTaskBadgeStyle(
                    member.active_tasks,
                    member.total_tasks
                  )}`}
                >
                  {member.active_tasks} / {member.total_tasks}
                </span>
              </td>

              {/* Firma ve Bio */}
              <td className="py-5 max-w-[220px]">
                <p className={`text-[13px] font-semibold truncate ${textSecondaryClass}`}>
                  {member.company || '—'}
                </p>
                <p className={`text-[11px] mt-1.5 line-clamp-2 leading-relaxed ${textMutedClass}`}>
                  {member.bio || 'Henüz biyografi eklenmemiş.'}
                </p>
              </td>

              {/* İşlemler */}
              <td className="py-5 pr-4 text-right">
                <div className="inline-flex items-center gap-0.5">
                  <button
                    onClick={() => onEdit(member)}
                    className={`p-2 rounded-lg transition-all duration-200 ${
                      isIceBlue 
                        ? 'text-slate-500 hover:text-iceBlue-600 hover:bg-iceBlue-50' 
                        : 'text-silver-600 hover:text-ice-400 hover:bg-white/[0.04]'
                    }`}
                    title="Düzenle"
                  >
                    <Pencil className="h-3.5 w-3.5" strokeWidth={2.5} />
                  </button>
                  <button
                    onClick={() => onDetail(member)}
                    className={`p-2 rounded-lg transition-all duration-200 ${
                      isIceBlue 
                        ? 'text-slate-500 hover:text-slate-700 hover:bg-iceBlue-50' 
                        : 'text-silver-600 hover:text-silver-200 hover:bg-white/[0.04]'
                    }`}
                    title="Detay"
                  >
                    <Eye className="h-3.5 w-3.5" strokeWidth={2.5} />
                  </button>
                  <button
                    onClick={() => onDelete(member.id)}
                    className={`p-2 rounded-lg transition-all duration-200 ${
                      isIceBlue 
                        ? 'text-slate-500 hover:text-red-500 hover:bg-red-50' 
                        : 'text-silver-600 hover:text-[#ff6b6b] hover:bg-[#ff6b6b]/10'
                    }`}
                    title="Sil"
                  >
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={2.5} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

{members.length === 0 && (
        <div className="py-16 text-center">
          <UserX className={`h-8 w-8 mx-auto mb-3 ${isIceBlue ? 'text-slate-400' : 'text-silver-700'}`} />
          <p className={`text-sm font-medium ${isIceBlue ? 'text-slate-500' : 'text-silver-600'}`}>
            Henüz üye bulunmamaktadır.
          </p>
        </div>
      )}
    </div>
  );
};

