import React from 'react';
import { Building2, Eye, Edit3, Trash2 } from 'lucide-react';
import { OrgDepartment } from '../../lib/supabaseOrgHierarchy';
import { getColorVariantById } from '../../lib/colorVariants';

interface OrgDepartmentCardProps {
  department: OrgDepartment;
  onClick: () => void;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export const OrgDepartmentCard: React.FC<OrgDepartmentCardProps> = ({
  department,
  onClick,
  onView,
  onEdit,
  onDelete,
}) => {
  const responsible = department.responsible_person;
  const variant = getColorVariantById(department.id || department.name);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      className="group relative w-full text-left rounded-3xl border border-white/10 bg-white/[0.03] p-4 transition-all duration-300 hover:bg-white/[0.05] hover:border-white/15"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 w-1 rounded-l-3xl opacity-70 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: `linear-gradient(180deg, ${variant.glowRGBA} 0%, rgba(0,0,0,0) 100%)` }}
      />

      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `radial-gradient(420px circle at 20% 0%, ${variant.gradientFrom}, transparent 55%)`,
        }}
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-3xl opacity-0 transition-opacity duration-300"
        style={{
          boxShadow: `0 0 0 0 rgba(0,0,0,0), 0 18px 60px ${variant.glowRGBA2}`,
        }}
      />

      <div className="relative pb-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Building2
                className="h-4 w-4"
                style={{ color: variant.text, filter: `drop-shadow(0 0 10px ${variant.glowRGBA2})` }}
              />
              <h3 className="font-display text-base font-bold tracking-tight text-silver-200 truncate">
                {department.name}
              </h3>
            </div>

            {department.description ? (
              <p className="mt-1 text-sm text-silver-600 line-clamp-2">
                {department.description}
              </p>
            ) : (
              <p className="mt-1 text-sm text-silver-600 line-clamp-2">
                Açıklama yok
              </p>
            )}
          </div>
        </div>

        <div className="mt-5 flex items-center gap-3">
          <div
            className="h-10 w-10 rounded-full border bg-white/[0.03] overflow-hidden flex items-center justify-center"
            style={{
              borderColor: variant.border,
              boxShadow: `0 0 0 4px rgba(255,255,255,0.00), 0 0 22px ${variant.glowRGBA2}`,
            }}
          >
            {responsible?.avatar ? (
              <img
                src={responsible.avatar}
                alt={responsible.name}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              <div
                className="h-8 w-8 rounded-full bg-white/[0.05] flex items-center justify-center text-xs font-bold"
                style={{ color: variant.text }}
              >
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
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onView();
            }}
            className="inline-flex h-8 w-8 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.08] text-silver-100 transition-all duration-200 hover:bg-white/[0.16] hover:text-white"
            style={{
              color: variant.text,
              boxShadow: `0 0 18px ${variant.glowRGBA2}`,
            }}
            aria-label="Detay Görüntüle"
          >
            <Eye className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="inline-flex h-8 w-8 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.08] text-silver-100 transition-all duration-200 hover:bg-white/[0.16] hover:text-white"
            style={{
              color: variant.text,
              boxShadow: `0 0 18px ${variant.glowRGBA2}`,
            }}
            aria-label="Düzenle"
          >
            <Edit3 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="inline-flex h-8 w-8 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.08] text-silver-100 transition-all duration-200 hover:bg-red-500/15 hover:text-red-300"
            style={{
              boxShadow: `0 0 18px ${variant.glowRGBA2}`,
            }}
            aria-label="Sil"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="absolute right-4 bottom-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300" aria-hidden="true">
          <span
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border bg-white/[0.08] text-silver-100 shadow-[0_0_24px_rgba(0,0,0,0.10)] transition-colors duration-200"
            style={{
              color: variant.text,
              borderColor: variant.border,
              background: variant.gradientFrom,
              boxShadow: `0 0 24px ${variant.glowRGBA2}`,
            }}
          >
            →
          </span>
        </div>
      </div>

      <div
        className="pointer-events-none absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          boxShadow: `0 14px 50px ${variant.glowRGBA2}`,
        }}
      />
    </div>
  );
};

