import React from 'react';
import { Cake, Gift } from 'lucide-react';
import { FullMember } from '../../types/member';
import { getColorVariantById } from '../../lib/colorVariants';

interface BirthdayCardProps {
  member: FullMember;
  isToday?: boolean;
}

const MONTHS = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];

export const BirthdayCard: React.FC<BirthdayCardProps> = ({ member, isToday = false }) => {
  const monthName = MONTHS[member.birth_month - 1] || '';
  const variant = getColorVariantById(member.id);

  return (
    <div 
      className={`relative group glass-card rounded-2xl p-5 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl ${
        isToday ? 'ring-2 shadow-xl' : ''
      }`}
      style={
        isToday
          ? { borderColor: variant.border, boxShadow: `0 0 24px ${variant.glowRGBA2}` }
          : undefined
      }
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 w-1 rounded-l-3xl opacity-70 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: `linear-gradient(180deg, ${variant.glowRGBA} 0%, rgba(0,0,0,0) 100%)` }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: `radial-gradient(420px circle at 20% 0%, ${variant.gradientFrom}, transparent 55%)` }}
      />
      {/* Birthday Badge */}
      {isToday && (
        <div className="absolute -top-2 -right-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-ice-400 to-ice-600 shadow-lg shadow-ice-500/50">
          <Cake className="h-4 w-4 text-white" />
        </div>
      )}

      <div className="flex items-center gap-4">
        {/* Avatar */}
        <div className="relative shrink-0">
          {member.avatar ? (
            <img 
              src={member.avatar} 
              alt={member.name}
              className="h-16 w-16 rounded-full object-cover border-2 border-white/10"
            />
          ) : (
            <div
              className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-white/10"
              style={{
                background: `linear-gradient(135deg, ${variant.hex}22, ${variant.gradientFrom})`,
              }}
            >
              <span className="text-xl font-bold" style={{ color: variant.text }}>
                {member.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          
          {/* Today indicator ring */}
          {isToday && (
            <div
              className="absolute inset-0 rounded-full animate-ping"
              style={{ backgroundColor: `${variant.glowRGBA}` }}
            />
          )}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-lg font-semibold text-silver-100 truncate">
            {member.name}
          </h3>
          
          {member.comm_title && (
            <p className="text-sm text-silver-500 truncate">
              {member.comm_title}
            </p>
          )}
          
          <div className="mt-2 flex items-center gap-2 text-sm">
            <div
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1"
              style={{
                backgroundColor: `${variant.gradientFrom}`,
                color: variant.text,
                boxShadow: `0 0 18px ${variant.glowRGBA2}`,
              }}
            >
              <Gift className="h-3.5 w-3.5" />
              <span className="font-medium">
                {member.birth_day} {monthName}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Hover Effect - Birthday message */}
      {isToday && (
        <div
          className="mt-4 rounded-lg p-3 text-center"
          style={{
            background: `linear-gradient(135deg, ${variant.glowRGBA} 0%, ${variant.gradientFrom} 100%)`,
          }}
        >
          <p className="text-sm font-medium" style={{ color: variant.text }}>
            🎉 Doğum günün kutlu olsun, {member.name}! 🎉
          </p>
        </div>
      )}
    </div>
  );
};

