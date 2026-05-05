import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  X, 
  Save, 
  Calendar, 
  Image as ImageIcon, 
  User, 
  Star, 
  AlertCircle,
  CheckCircle2,
  Loader2 ,
  Image,
} from 'lucide-react';
import { createTask, updateTask, getMembersTaskCounts } from '../../lib/supabaseTasks';
import { FullTask, TaskStatus, TASK_STATUS_VALUES, TaskFormData } from '../../types/task';
import { FullMember } from '../../types/member';

interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  task?: FullTask | null;
  onSuccess: () => void;
}

export const TaskFormModal: React.FC<TaskFormModalProps> = ({
  isOpen,
  onClose,
  task,
  onSuccess
}) => {
const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const [formData, setFormData] = useState<Omit<TaskFormData, 'assignee_id'> & { assignee_id: string }>({
    title: '',
    description: '',
    deadline: '',
    image_url: '',
    points: 1,
    assignee_id: '',
    status: 'backlog'
  });
const [members, setMembers] = useState<FullMember[]>([]);
  const [taskCounts, setTaskCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchMembers();
      if (task) {
        setFormData({
          title: task.title,
          description: task.description || '',
          deadline: task.deadline || '',
          image_url: task.image_url || '',
          points: task.points,
          assignee_id: task.assignee_id || '',
          status: task.status
        });
      } else {
        resetForm();
      }
    }
  }, [isOpen, task]);

const fetchMembers = async () => {
    try {
      const { getMembers } = await import('../../lib/supabaseMembers');
      const response = await getMembers();
      setMembers(response.data);
      
      // Fetch task counts for all members
      const memberIds = response.data.map((m: FullMember) => m.id);
      if (memberIds.length > 0) {
        const counts = await getMembersTaskCounts(memberIds);
        setTaskCounts(counts);
      }
    } catch (err) {
      console.error('Üyeler yüklenemedi:', err);
    }
  };
  
  // useMemo to calculate filtered members (those NOT at capacity)
  const maxTaskLimit = 3;
  const membersWithCapacity = useMemo(() => {
    return members.map(member => {
      const currentCount = taskCounts[member.id] || 0;
      const remaining = maxTaskLimit - currentCount;
      const isAtCapacity = currentCount >= maxTaskLimit;
      return {
        ...member,
        currentTaskCount: currentCount,
        isAtCapacity
      };
    });
  }, [members, taskCounts]);

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      deadline: '',
      image_url: '',
      points: 1,
      assignee_id: '',
      status: 'backlog'
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Fix UUID error: convert empty string to null
    const cleanedData = {
      ...formData,
      assignee_id: formData.assignee_id === '' ? null : formData.assignee_id
    };

    try {
      if (task) {
        await updateTask(task.id, cleanedData);
      } else {
        await createTask(cleanedData);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Form kaydedilemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleImagePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          // Supabase Storage upload would go here
          // For now, generate placeholder URL
          const placeholder = URL.createObjectURL(file);
          setFormData(prev => ({ ...prev, image_url: placeholder }));
          e.preventDefault();
        }
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-xl" 
        onClick={onClose}
      />
      <div className="relative w-full max-w-2xl mx-auto rounded-3xl border border-white/10 bg-gradient-to-b from-coal-800/95 via-coal-900/90 to-coal-800/95 shadow-3xl backdrop-blur-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-coal-900/50 border-b border-white/5 p-6 backdrop-blur-xl z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-emerald-600/10 border border-emerald-500/20">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <h2 className="font-display text-2xl font-bold text-silver-100">
                  {task ? 'Görev Düzenle' : 'Yeni Görev'}
                </h2>
                <p className="text-sm text-silver-500">
                  Görev detaylarını girin
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-silver-400 hover:text-silver-200 hover:bg-white/10 transition-all"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-silver-300 mb-2">
              Görev Başlığı *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              required
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/20 text-silver-100 placeholder-silver-600 focus:outline-none focus:ring-2 focus:ring-ice-500/30 focus:border-white/50 transition-all"
              placeholder="Görev başlığını yazın..."
            />
          </div>

{/* Description - Textarea with LTR support */}
          <div>
            <label className="block text-sm font-semibold text-silver-300 mb-2">
              Açıklama
            </label>
<textarea
              ref={descriptionRef}
              value={formData.description || ''}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              dir="ltr"
              className="w-full min-h-[180px] px-4 py-3 rounded-xl bg-white/5 border border-white/20 text-silver-100 text-sm placeholder-silver-600 focus:outline-none focus:ring-2 focus:ring-ice-500/30 focus:border-white/50 transition-all resize-y text-left"
              placeholder="Görev açıklamasını yazın..."
            />
            <p className="text-xs text-silver-500 mt-2 flex items-center gap-1">
              <Image className="h-3 w-3" />
              Detaylı açıklama yazabilirsiniz
            </p>
          </div>

          {/* Image URL */}
          <div>
            <label className="block text-sm font-semibold text-silver-300 mb-2">
              Resim URL (Opsiyonel)
            </label>
            <input
              type="url"
              value={formData.image_url}
              onChange={(e) => setFormData({...formData, image_url: e.target.value})}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/20 text-silver-100 placeholder-silver-600 focus:ring-2 focus:ring-ice-500/30 focus:border-white/50 transition-all"
              placeholder="https://example.com/image.jpg"
            />
            {formData.image_url && (
              <div className="mt-2 p-1">
                <img src={formData.image_url} alt="Önizleme" className="max-w-full max-h-32 rounded-xl object-cover border border-white/20 shadow-lg" />
              </div>
            )}
          </div>

          {/* Grid: Assignee, Points, Status, Deadline */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
{/* Assignee */}
            <div>
              <label className="block text-xs font-semibold text-silver-400 uppercase tracking-wider mb-2">
                Atanan Üye
              </label>
              <select
                value={formData.assignee_id || ''}
                onChange={(e) => setFormData({...formData, assignee_id: e.target.value})}
                className="w-full px-3 py-2.5 rounded-lg bg-coal-900 border border-white/20 text-silver-100 text-sm focus:ring-2 focus:ring-ice-500/30 focus:border-white/50 transition-all"
              >
                <option value="" className="bg-coal-900 text-silver-100">Kimse atanmadı</option>
                {membersWithCapacity.map(member => (
                  <option 
                    key={member.id} 
                    value={member.id} 
                    disabled={member.isAtCapacity}
                    className={`bg-coal-900 text-silver-100 ${member.isAtCapacity ? 'opacity-50' : ''}`}
                  >
                    {member.name} - {member.comm_title} {member.isAtCapacity ? '(Maksimum Kapasite 3/3)' : `(${member.currentTaskCount}/3)`}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-silver-500 mt-1">
                💡 Kapasitesi dolu üyeler seçilemez
              </p>
            </div>

            {/* Points */}
            <div>
              <label className="block text-xs font-semibold text-silver-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                Puan <Star className="h-3 w-3 text-amber-400 fill-current" />
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={formData.points}
                onChange={(e) => setFormData({...formData, points: parseInt(e.target.value) || 1})}
                className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/20 text-silver-100 text-sm focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50 transition-all"
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-semibold text-silver-400 uppercase tracking-wider mb-2">
                Durum
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({...formData, status: e.target.value as TaskStatus})}
                className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/20 text-silver-100 text-sm focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition-all"
              >
                {TASK_STATUS_VALUES.map(status => (
                  <option key={status} value={status}>
                    {status.replace('_', ' ').replace(/\\b(\\w)/g, l => l.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>

            {/* Deadline */}
            <div>
              <label className="block text-xs font-semibold text-silver-400 uppercase tracking-wider mb-2">
                Son Tarih
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-silver-500" />
<input
                  type="datetime-local"
                  value={formData.deadline || ''}
                  onChange={(e) => setFormData({...formData, deadline: e.target.value})}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white/5 border border-white/20 text-silver-100 text-sm focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500/50 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex items-center gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 rounded-xl text-sm font-semibold text-silver-400 hover:text-silver-200 hover:bg-white/10 transition-all border border-white/10"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-600 hover:to-emerald-700 shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed border-0"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Kaydediliyor...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Kaydet
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

