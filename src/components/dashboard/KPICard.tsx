import React from 'react';
import { LucideIcon } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  suffix?: string;
  gradient?: string; // e.g. "from-emerald-400/10 to-emerald-500/5"
}


export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  icon: Icon,
  suffix,
  gradient,
}) => {

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-coal-700/50 p-6 backdrop-blur-sm transition-all duration-500 ease-out hover:-translate-y-1 hover:rotate-1 hover:border-white/[0.12] hover:bg-coal-700/80 hover:shadow-[0_0_40px_rgba(116,192,252,0.08),0_0_80px_rgba(116,192,252,0.04)]">
      {/* Subtle glow effect behind */}
      <div className={`absolute -inset-px rounded-2xl bg-gradient-to-br ${gradient || 'from-ice-500/[0.03]'} to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100`} />


      <div className="relative flex items-start justify-between">
        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-wider text-silver-600">
            {title}
          </p>
          <div className="flex items-baseline gap-1">
            <span className="font-display text-3xl font-bold tracking-tight text-silver-100">
              {value}
            </span>
            {suffix ? (
              <span className="text-sm font-medium text-silver-500">{suffix}</span>
            ) : null}
          </div>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.03] transition-colors duration-300 group-hover:border-ice-500/20 group-hover:bg-ice-500/[0.06]">
          <Icon className="h-5 w-5 text-silver-500 transition-colors duration-300 group-hover:text-ice-400" />
        </div>
      </div>
    </div>
  );
};

