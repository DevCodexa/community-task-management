import React from 'react';
import { Users } from 'lucide-react';
import { RecentMember } from '../../lib/supabaseMembers';

interface RecentMembersTableProps {
  members: RecentMember[];
}

export const RecentMembersTable: React.FC<RecentMembersTableProps> = ({ members }) => {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const hasMembers = members.length > 0;

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-coal-700/30 p-6 backdrop-blur-6m">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.03]">
          <Users className="h-4 w-4 text-cyan-400" />
        </div>
        <div>
          <h2 className="font-display text-base font-semibold text-silver-100">
            Son Eklenen Üyeler
          </h2>
          <p className="text-xs text-silver-600">En son eklenen 5 üye</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.04]">
              <th className="pb-3 text-left text-xs font-medium uppercase tracking-wider text-silver-600">
                Üye
              </th>
              <th className="pb-3 text-left text-xs font-medium uppercase tracking-wider text-silver-600">
                Topluluk Ünvanı
              </th>
              <th className="pb-3 text-right text-xs font-medium uppercase tracking-wider text-silver-600">
                Eklenme Tarihi
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.03]">
            {hasMembers ? (
              members.map((member) => (
                <tr
                  key={member.id}
                  className="group transition-colors duration-200 hover:bg-white/[0.02]"
                >
                  <td className="py-3.5">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={member.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=0D8ABC&color=fff`}
                        alt={member.name}
                        className="h-7 w-7 rounded-full border border-white/[0.06] object-cover"
                      />
                      <span className="text-sm font-medium text-silver-200 transition-colors duration-200 group-hover:text-silver-100">
                        {member.name}
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5">
                    <span className="text-sm text-silver-500 transition-colors duration-200 group-hover:text-silver-400">
                      {member.comm_title || '-'}
                    </span>
                  </td>
                  <td className="py-3.5 text-right">
                    <span className="text-xs text-silver-600">
                      {formatDate(member.created_at)}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="py-8 text-center text-sm text-silver-600">
                  Henüz üye bulunamadı
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
