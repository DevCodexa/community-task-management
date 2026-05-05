import React from 'react';
import { X, Mail, Phone, Building2, Briefcase, Award, Shield, Calendar, FileText } from 'lucide-react';
import { FullMember } from '../../types/member';

interface DetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: FullMember | null;
}

export const DetailModal: React.FC<DetailModalProps> = ({
  isOpen,
  onClose,
  member,
}) => {
  if (!isOpen || !member) return null;

  const isTaskLimitReached = member.active_tasks >= member.total_tasks;

  const months = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-xl"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-coal-800/90 shadow-2xl">
        {/* Header with Avatar */}
        <div className="relative px-6 pt-6 pb-4">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 p-2 rounded-lg text-silver-500 hover:text-silver-200 hover:bg-white/[0.05] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex flex-col items-center text-center">
            <img
              src={member.avatar}
              alt={member.name}
              className="h-20 w-20 rounded-full object-cover ring-2 ring-white/10 mb-3"
            />
            <h2 className="text-xl font-bold text-silver-100">{member.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-silver-400">{member.comm_title}</span>
              <span className="text-silver-600">&bull;</span>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  member.system_role === 'Super Admin'
                    ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                    : member.system_role === 'Admin'
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    : 'bg-silver-500/10 text-silver-400 border border-silver-500/20'
                }`}
              >
                <Shield className="h-3 w-3 mr-1" />
                {member.system_role}
              </span>
            </div>
          </div>
        </div>

        {/* Task Status Badge */}
        <div className="px-6 pb-2">
          <div className="flex items-center justify-center">
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                isTaskLimitReached
                  ? 'bg-red-500/15 text-red-400 ring-1 ring-red-500/25'
                  : 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20'
              }`}
            >
              Aktif Görev: {member.active_tasks} / {member.total_tasks}
            </span>
          </div>
        </div>

        {/* Info Grid */}
        <div className="px-6 py-4 space-y-3">
          <div className="grid grid-cols-1 gap-3">
            {/* Email */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/5">
              <div className="p-2 rounded-lg bg-ice-500/10">
                <Mail className="h-4 w-4 text-ice-400" />
              </div>
              <div>
                <p className="text-xs text-silver-600">E-posta</p>
                <p className="text-sm text-silver-200">{member.email}</p>
              </div>
            </div>

            {/* Phone */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/5">
              <div className="p-2 rounded-lg bg-ice-500/10">
                <Phone className="h-4 w-4 text-ice-400" />
              </div>
              <div>
                <p className="text-xs text-silver-600">Telefon</p>
                <p className="text-sm text-silver-200">{member.phone || '-'}</p>
              </div>
            </div>

            {/* Company & Job */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/5">
                <div className="p-2 rounded-lg bg-ice-500/10">
                  <Building2 className="h-4 w-4 text-ice-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-silver-600">Şirket</p>
                  <p className="text-sm text-silver-200 truncate">{member.company || '-'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/5">
                <div className="p-2 rounded-lg bg-ice-500/10">
                  <Briefcase className="h-4 w-4 text-ice-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-silver-600">İş Ünvanı</p>
                  <p className="text-sm text-silver-200 truncate">{member.job_title || '-'}</p>
                </div>
              </div>
            </div>

            {/* Comm Title & Birth Date */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/5">
                <div className="p-2 rounded-lg bg-ice-500/10">
                  <Award className="h-4 w-4 text-ice-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-silver-600">Topluluk Ünvanı</p>
                  <p className="text-sm text-silver-200 truncate">{member.comm_title || '-'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/5">
                <div className="p-2 rounded-lg bg-ice-500/10">
                  <Calendar className="h-4 w-4 text-ice-400" />
                </div>
                <div>
                  <p className="text-xs text-silver-600">Doğum Günü</p>
                  <p className="text-sm text-silver-200">
                    {member.birth_day} {months[member.birth_month - 1]}
                  </p>
                </div>
              </div>
            </div>

            {/* Bio */}
            {member.bio && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/5">
                <div className="p-2 rounded-lg bg-ice-500/10 shrink-0">
                  <FileText className="h-4 w-4 text-ice-400" />
                </div>
                <div>
                  <p className="text-xs text-silver-600">Biyografi</p>
                  <p className="text-sm text-silver-200 leading-relaxed">{member.bio}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-lg text-sm font-medium text-silver-400 hover:text-silver-200 hover:bg-white/[0.05] transition-colors"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};

