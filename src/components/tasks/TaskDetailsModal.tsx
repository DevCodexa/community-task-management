import React from 'react';
import { 
  X, 
  Eye, 
  Edit3, 
  Calendar, 
  User, 
  Star, 
  Clock, 
  AlertCircle,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { FullTask, TaskStatus, isOverdue, isLateCompleted } from '../../types/task';

interface TaskDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: FullTask | null;
  onEdit: (task: FullTask) => void;
}

const STATUS_LABELS: Record<TaskStatus, string> = {
  backlog: 'Beklemede',
  started: 'Başlandı',
  in__progress: 'Devam Ediyor',
  completed: 'Tamamlandı',
  done: 'Bitti',
};

const STATUS_BADGE_CLASSES: Record<TaskStatus, string> = {
  backlog: 'bg-gray-500/20 text-gray-400 ring-gray-500/30',
  started: 'bg-yellow-500/20 text-yellow-400 ring-yellow-500/30',
  in_progress: 'bg-orange-500/20 text-orange-400 ring-orange-500/30',
  completed: 'bg-green-500/20 text-green-400 ring-green-500/30',
  done: 'bg-emerald-500/20 text-emerald-400 ring-emerald-500/30',
};

export const TaskDetailsModal: React.FC<TaskDetailsModalProps> = ({
  isOpen,
  onClose,
  task,
  onEdit,
}) => {
  if (!isOpen || !task) return null;

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const handleEditClick = () => {
    onClose();
    setTimeout(() => {
      onEdit(task);
    }, 100);
  };

  const taskIsOverdue = isOverdue(task);
  const taskIsLateCompleted = isLateCompleted(task);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-2xl" 
        onClick={onClose}
      />
      
      {/* Modal Container */}
      <div className="relative w-full max-w-2xl mx-auto rounded-3xl border border-white/10 bg-gradient-to-b from-coal-800/95 via-coal-900/90 to-coal-800/95 shadow-3xl backdrop-blur-3xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="sticky top-0 z-10 bg-coal-900/80 border-b border-white/10 p-6 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-gradient-to-br from-ice-500/10 to-blue-500/10 border border-ice-500/20">
                <Eye className="h-5 w-5 text-ice-400" />
              </div>
              <div>
                <h2 className="font-display text-xl font-bold text-silver-100">
                  Görev Detayları
                </h2>
                <p className="text-sm text-silver-500">
                  Görev bilgilerini görüntüle
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Edit Button */}
              <button
                onClick={handleEditClick}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-600 hover:to-emerald-700 shadow-lg hover:shadow-xl transition-all"
              >
                <Edit3 className="h-4 w-4" />
                Düzenle
              </button>
              
              {/* Close Button */}
              <button
                onClick={onClose}
                className="p-2.5 rounded-xl text-silver-400 hover:text-silver-200 hover:bg-white/10 transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
          
          {/* Status Badge + Overdue Warning */}
          <div className="flex flex-wrap items-center gap-3">
            <div className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold ring-1 ${STATUS_BADGE_CLASSES[task.status]}`}>
              <CheckCircle2 className="h-4 w-4" />
              {STATUS_LABELS[task.status]}
            </div>
            
            {taskIsOverdue && (
              <div className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold bg-red-500/20 text-red-400 ring-1 ring-red-500/30">
                <AlertCircle className="h-4 w-4" />
                Süresi Geçmiş!
              </div>
            )}
            
            {taskIsLateCompleted && (
              <div className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold bg-red-500/20 text-red-400 ring-1 ring-red-500/30">
                <Clock className="h-4 w-4" />
                Geç Tamamlandı
              </div>
            )}
          </div>

          {/* Title */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-silver-500">
              Başlık
            </h3>
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
              <h4 className="font-display text-xl font-bold text-silver-100 leading-relaxed">
                {task.title}
              </h4>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-silver-500">
              Açıklama
            </h3>
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-white/20">
              {task.description ? (
                <p className="text-silver-300 leading-relaxed whitespace-pre-wrap text-left" dir="auto">
                  {task.description}
                </p>
              ) : (
                <p className="text-silver-600 italic">Açıklama yok</p>
              )}
            </div>
          </div>

          {/* Meta Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Assignee */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-silver-500 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />
                Atanan Kişi
              </h3>
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                {task.assignee_id && task.members ? (
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-ice-500 to-blue-500 flex items-center justify-center flex-shrink-0">
                      {task.members.avatar ? (
                        <img 
                          src={task.members.avatar} 
                          alt={task.members.name} 
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <User className="h-5 w-5 text-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-silver-100 truncate">
                        {task.members.name}
                      </p>
                      {task.members.comm_title && (
                        <p className="text-xs text-silver-500 truncate">
                          {task.members.comm_title}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-silver-600">
                    <User className="h-5 w-5" />
                    <span>Atanmamış</span>
                  </div>
                )}
              </div>
            </div>

            {/* Points */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-silver-500 flex items-center gap-1.5">
                <Star className="h-3.5 w-3.5 text-amber-400 fill-current" />
                Puan
              </h3>
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                <span className={`text-2xl font-bold ${taskIsOverdue ? 'text-red-400' : 'text-amber-400'}`}>
                  {task.points}
                </span>
                <span className="ml-2 text-silver-400">puan</span>
              </div>
            </div>

            {/* Deadline */}
            {task.deadline && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-silver-500 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  Bitiş Tarihi
                </h3>
                <div className={`p-4 rounded-2xl border ${taskIsOverdue ? 'bg-red-500/10 border-red-500/30' : 'bg-white/5 border-white/10'}`}>
                  <p className={`font-semibold ${taskIsOverdue ? 'text-red-400' : 'text-silver-100'}`}>
                    {formatDate(task.deadline)}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Timestamps */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-silver-500 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              Tarih Bilgileri
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <p className="text-xs text-silver-500 mb-1">Oluşturulma</p>
                <p className="text-sm text-silver-300">
                  {formatDateTime(task.created_at)}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <p className="text-xs text-silver-500 mb-1">Son Güncelleme</p>
                <p className="text-sm text-silver-300">
                  {formatDateTime(task.updated_at)}
                </p>
              </div>
            </div>
          </div>

          {/* Edit Navigation */}
          <div className="pt-4 border-t border-white/10">
            <button
              onClick={handleEditClick}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border border-emerald-500/20 text-emerald-400 hover:from-emerald-500/20 hover:to-blue-500/20 hover:border-emerald-500/30 transition-all group"
            >
              <span className="font-semibold">Görevi Düzenle</span>
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
