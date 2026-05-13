import React from 'react';
import {
  User,
  Mail,
  Phone,
  Building2,
  Briefcase,
  Award,
  Calendar,
  Shield,
  FileText,
  ImageIcon,
} from 'lucide-react';
import { MemberFormData, SystemRole } from '../../types/member';

const systemRoles: SystemRole[] = ['Super Admin', 'Admin', 'User'];

const roleMeta: Record<
  SystemRole,
  { label: string; color: string }
> = {
  'Super Admin': {
    label: 'Super Admin',
    color: 'text-purple-400',
  },
  Admin: {
    label: 'Admin',
    color: 'text-amber-400',
  },
  User: {
    label: 'User',
    color: 'text-silver-400',
  },
};

const days = Array.from({ length: 31 }, (_, i) => i + 1);
const months = [
  { value: 1, label: 'Ocak' },
  { value: 2, label: 'Şubat' },
  { value: 3, label: 'Mart' },
  { value: 4, label: 'Nisan' },
  { value: 5, label: 'Mayıs' },
  { value: 6, label: 'Haziran' },
  { value: 7, label: 'Temmuz' },
  { value: 8, label: 'Ağustos' },
  { value: 9, label: 'Eylül' },
  { value: 10, label: 'Ekim' },
  { value: 11, label: 'Kasım' },
  { value: 12, label: 'Aralık' },
];

interface MemberFormFieldsProps {
  formData: MemberFormData;
  onChange: (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => void;
}

export const MemberFormFields: React.FC<MemberFormFieldsProps> = ({
  formData,
  onChange,
}) => {
  const avatarPreview =
    formData.avatar?.trim() ||
    (formData.name
      ? `https://ui-avatars.com/api/?name=${encodeURIComponent(
          formData.name
        )}&background=0D8ABC&color=fff&bold=true&length=1`
      : 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56"><rect width="100%" height="100%" rx="28" fill="%230D8ABC"/></svg>');


  const inputBase =
    'w-full pl-9 pr-3 py-2.5 rounded-lg bg-white/[0.03] border border-white/10 text-silver-100 text-sm placeholder:text-silver-700 focus:outline-none focus:border-ice-500/50 focus:ring-1 focus:ring-ice-500/20 transition-all';

  const labelBase = 'block text-xs font-medium text-silver-400 mb-1.5';

  return (
    <div className="space-y-6 px-2">
      {/* Avatar Preview & URL Input */}
      <div className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/5">

          <img
          src={avatarPreview}
          alt="Avatar preview"
          className="h-14 w-14 rounded-full object-cover ring-2 ring-white/10 bg-iceBlue-500/10"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src =
              'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56"><rect width="100%" height="100%" rx="28" fill="%230D8ABC"/></svg>';
          }}
        />

          <div className="flex-1 min-w-0">
          <label className={labelBase}>Profil Fotoğrafı URL</label>
          <div className="relative">
            <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-silver-600" />

            <input
              type="url"
              name="avatar"
              value={formData.avatar || ''}
              onChange={onChange}
              className={inputBase}
              placeholder="https://... (boş bırakılırsa otomatik oluşturulur)"
            />
          </div>
        </div>
      </div>

      {/* Ad Soyad & Email */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelBase}>Ad Soyad</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-silver-600" />
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={onChange}
              required
              className={inputBase}
              placeholder="Ad Soyad"
            />
          </div>
        </div>
        <div>
          <label className={labelBase}>E-posta</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-silver-600" />
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={onChange}
              required
              className={inputBase}
              placeholder="mail@example.com"
            />
          </div>
        </div>
      </div>

      {/* Telefon & Şirket */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelBase}>Telefon</label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-silver-600" />
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={onChange}
              className={inputBase}
              placeholder="+90 555 123 5353"
            />
          </div>
        </div>
        <div>
          <label className={labelBase}>Şirket</label>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-silver-600" />
            <input
              type="text"
              name="company"
              value={formData.company}
              onChange={onChange}
              className={inputBase}
              placeholder="Tech Corp"
            />
          </div>
        </div>
      </div>

      {/* İş Ünvanı & Topluluk Ünvanı */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelBase}>İş Ünvanı</label>
          <div className="relative">
            <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-silver-600" />
            <input
              type="text"
              name="job_title"
              value={formData.job_title}
              onChange={onChange}
              className={inputBase}
              placeholder="Yazılım Geliştirici"
            />
          </div>
        </div>
        <div>
          <label className={labelBase}>Topluluk Ünvanı</label>
          <div className="relative">
            <Award className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-silver-600" />
            <input
              type="text"
              name="comm_title"
              value={formData.comm_title}
              onChange={onChange}
              className={inputBase}
              placeholder="Core Team Member"
            />
          </div>
        </div>
      </div>

      {/* Doğum Günü & Sistem Rolü */}
      <div className="grid grid-cols-1 sm:grid-cols-1 gap-4">
        <div>
          <label className={labelBase}>Doğum Günü</label>
          <div className="grid grid-cols-2 gap-3">
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-silver-600" />
              <select
                name="birth_day"
                value={formData.birth_day}
                onChange={onChange}
                className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-white/[0.03] border border-white/10 text-silver-100 text-sm focus:outline-none focus:border-ice-500/50 focus:ring-1 focus:ring-ice-500/20 transition-all appearance-none cursor-pointer"
              >
                {days.map((day) => (
                  <option key={day} value={day} className="bg-coal-800">
                    {day}
                  </option>
                ))}
              </select>
            </div>
            <select
              name="birth_month"
              value={formData.birth_month}
              onChange={onChange}
              className="w-full px-3 py-2.5 rounded-lg bg-white/[0.03] border border-white/10 text-silver-100 text-sm focus:outline-none focus:border-ice-500/50 focus:ring-1 focus:ring-ice-500/20 transition-all appearance-none cursor-pointer"
            >
              {months.map((month) => (
                <option
                  key={month.value}
                  value={month.value}
                  className="bg-coal-800"
                >
                  {month.label}
                </option>
              ))}
            </select>
          </div>
        </div>

      {/*  <div>
          <label className={labelBase}>Sistem Rolü</label>
          <div className="relative">
            <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-silver-600 z-10" />
            <select
              name="system_role"
              value={formData.system_role}
              onChange={onChange}
              className={`w-full pl-9 pr-8 py-2.5 rounded-lg bg-white/[0.03] border border-white/10 text-sm focus:outline-none focus:border-ice-500/50 focus:ring-1 focus:ring-ice-500/20 transition-all appearance-none cursor-pointer font-medium ${roleMeta[formData.system_role].color}`}
            >
              {systemRoles.map((role) => (
                <option
                  key={role}
                  value={role}
                  className={`bg-coal-800 font-medium ${roleMeta[role].color}`}
                >
                  {roleMeta[role].label}
                </option>
              ))}
            </select>
          </div>
        </div>*/}

      </div>

      {/* Biyografi */}
      <div>
        <label className={labelBase}>Biyografi</label>
        <div className="relative">
          <FileText className="absolute left-3 top-3 h-4 w-4 text-silver-600" />
          <textarea
            name="bio"
            value={formData.bio}
            onChange={onChange}
            rows={3}
            className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-white/[0.03] border border-white/10 text-silver-100 text-sm placeholder:text-silver-700 focus:outline-none focus:border-ice-500/50 focus:ring-1 focus:ring-ice-500/20 transition-all resize-none"
            placeholder="Kısa bir biyografi yazın..."
          />
        </div>
      </div>
    </div>
  );
};

