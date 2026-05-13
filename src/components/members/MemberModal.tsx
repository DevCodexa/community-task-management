import React, { useState, useEffect } from 'react';
import {
  X,
  AlertTriangle,
  Save,
  UserPlus,
} from 'lucide-react';
import { FullMember, MemberFormData } from '../../types/member';
import { createMember, updateMember } from '../../lib/supabaseMembers';
import { MemberFormFields } from './MemberFormFields';
import { useTheme } from '../../context/ThemeContext';

interface MemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  member?: FullMember | null;
  onSuccess: () => void;
}

const initialFormData: MemberFormData = {
  name: '',
  email: '',
  phone: '',
  company: '',
  job_title: '',
  comm_title: '',
  bio: '',
  birth_day: 1,
  birth_month: 1,
  system_role: 'User',
  avatar: '',
};

export const MemberModal: React.FC<MemberModalProps> = ({
  isOpen,
  onClose,
  member,
  onSuccess,
}) => {
  const { isIceBlue } = useTheme()
  const [formData, setFormData] = useState<MemberFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!member;
  const isTaskLimitReached = member
    ? member.active_tasks >= member.total_tasks
    : false;

  useEffect(() => {
    if (member) {
      setFormData({
        name: member.name,
        email: member.email,
        phone: member.phone,
        company: member.company,
        job_title: member.job_title,
        comm_title: member.comm_title,
        bio: member.bio,
        birth_day: member.birth_day,
        birth_month: member.birth_month,
        system_role: member.system_role,
        avatar: member.avatar || '',
      });
    } else {
      setFormData(initialFormData);
    }
    setError(null);
  }, [member, isOpen]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === 'birth_day' || name === 'birth_month'
          ? parseInt(value)
          : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const payload = {
        ...formData,
        avatar:
          formData.avatar?.trim() ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(
            formData.name
          )}&background=0D8ABC&color=fff`,
      };

      if (isEditing && member) {
        await updateMember(member.id, payload);
      } else {
        await createMember(payload);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">

      {/* Glassmorphism Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-xl"
        onClick={onClose}
      />

{/* Modal Card */}
      <div className={`relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl ${
        isIceBlue 
          ? 'bg-white border border-iceBlue-100' 
          : 'border border-white/10 bg-coal-800/60 backdrop-blur-2xl'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-5 ${
          isIceBlue ? 'bg-iceBlue-50 border-b border-iceBlue-100' : 'border-b border-white/10'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              isIceBlue ? 'bg-iceBlue-100' : 'bg-ice-500/10'
            }`}>
              <UserPlus className={`h-5 w-5 ${
                isIceBlue ? 'text-iceBlue-600' : 'text-ice-500'
              }`} />
            </div>
            <div>
              <h2 className={`text-lg font-bold ${
                isIceBlue ? 'text-slate-800' : 'text-silver-100'
              }`}>
                {isEditing ? 'Üye Düzenle' : 'Yeni Üye Ekle'}
              </h2>
              <p className={`text-xs ${
                isIceBlue ? 'text-slate-500' : 'text-silver-600'
              }`}>
                {isEditing
                  ? 'Üye bilgilerini güncelleyin'
                  : 'Yeni bir topluluk üyesi ekleyin'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              isIceBlue 
                ? 'text-slate-500 hover:text-slate-800 hover:bg-iceBlue-50' 
                : 'text-silver-500 hover:text-silver-200 hover:bg-white/[0.05]'
            }`}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Task Limit Warning */}
        {isTaskLimitReached && (
          <div className="mx-6 mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3">

            <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-400">
                Görev Limiti Uyarısı
              </p>
              <p className="text-xs text-red-300/80 mt-0.5">
                Bu üye zaten maksimum görev sayısına ({member?.total_tasks})
                ulaşmış. Yeni görev ataması yapılamaz.
              </p>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {error && (
          <div className="mx-6 mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
              {error}
            </div>

          )}

          <MemberFormFields formData={formData} onChange={handleChange} />

        {/* Footer Actions */}
        <div className="flex items-center justify-center sm:justify-end gap-3 px-6 pb-6 pt-2">


            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-lg text-sm font-medium text-silver-400 hover:text-silver-200 hover:bg-white/[0.05] transition-colors"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-ice-500/10 text-ice-400 border border-ice-500/20 hover:bg-ice-500/20 hover:text-ice-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="h-4 w-4" />
              {isSubmitting
                ? 'Kaydediliyor...'
                : isEditing
                ? 'Güncelle'
                : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

