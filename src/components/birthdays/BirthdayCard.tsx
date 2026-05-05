import React from 'react';
import { Cake, Gift } from 'lucide-react';
import { FullMember } from '../../types/member';

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

  return (
    <div 
      className={`relative group glass-card rounded-2xl p-5 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl ${
        isToday 
          ? 'ring-2 ring-ice-400 shadow-[0_0_20px_rgba(116,192,252,0.3)]' 
          : ''
      }`}
    >
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
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-ice-500/20 to-purple-500/20 border-2 border-white/10">
              <span className="text-xl font-bold text-ice-400">
                {member.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          
          {/* Today indicator ring */}
          {isToday && (
            <div className="absolute inset-0 rounded-full animate-ping bg-ice-400/30" />
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
            <div className="flex items-center gap-1.5 rounded-lg bg-ice-500/10 px-2.5 py-1">
              <Gift className="h-3.5 w-3.5 text-ice-400" />
              <span className="text-ice-400 font-medium">
                {member.birth_day} {monthName}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Hover Effect - Birthday message */}
      {isToday && (
        <div className="mt-4 rounded-lg bg-gradient-to-r from-ice-500/10 to-purple-500/10 p-3 text-center">
          <p className="text-sm font-medium text-ice-300">
            🎉 Doğum günün kutlu olsun, {member.name}! 🎉
          </p>
        </div>
      )}
    </div>
  );
};

