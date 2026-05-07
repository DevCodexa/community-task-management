import React from 'react';
import { Building2, User } from 'lucide-react';
import { OrgDepartment } from '../../lib/supabaseOrgHierarchy';

interface OrgDepartmentCardProps {
  department: OrgDepartment;
  onClick: () => void;
}

export const OrgDepartmentCard: React.FC<OrgDepartmentCardProps> = ({
  department,
  onClick,
}) => {
  const responsible = department.responsible_person;

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative w-full text-left rounded-3xl border border-white/10 bg-white/[0.03] p-5 transition-all duration-300 hover:bg-white/[0.05] hover:border-white/15"
    >
      {/* Hover shine */}
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background:
            'radial-gradient(420px circle at 20% 0%, rgba(116,192,252,0.22), transparent 50%)',
        }}
      />

      {/* Soft lift + glow */}
      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-ice-300" />
              <h3 className="font-display text-lg font-bold tracking-tight text-silver-100 truncate">
                {department.name}
              </h3>
            </div>

            {department.description ? (
              <p className="mt-2 text-sm text-silver-600 line-clamp-2">
                {department.description}
              </p>
            ) : (
              <p className="mt-2 text-sm text-silver-600 line-clamp-2">
                Açıklama yok
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 flex items-center gap-2 shrink-0">
            <User className="h-4 w-4 text-ice-300" />
            <span className="text-xs font-semibold text-silver-100">Sorumlu</span>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-3">
          <div className="h-10 w-10 rounded-full border border-white/10 bg-white/[0.03] overflow-hidden flex items-center justify-center">
            {responsible?.avatar ? (
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              <img
                src={responsible.avatar}
                alt={responsible.name}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-white/[0.05] flex items-center justify-center text-silver-600 text-xs font-bold">
                {responsible?.name?.[0]?.toUpperCase() ?? '—'}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-silver-100 truncate">
              {responsible?.name ?? 'Atanmadı'}
            </p>
            <p className="text-xs text-silver-600 truncate">
              {responsible ? 'Sorumlu kişi' : 'Lütfen sorumlu atayın'}
            </p>
          </div>

          <div
            className="opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            aria-hidden="true"
          >
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-ice-500/20 bg-ice-500/10 text-ice-300">
              →
            </span>
          </div>
        </div>
      </div>

      {/* Subtle lift on hover */}
      <div className="pointer-events-none absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{
        boxShadow: '0 14px 40px rgba(116,192,252,0.12)',
      }} />
    </button>
  );
};

