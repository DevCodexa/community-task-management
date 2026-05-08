import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Trash2, 
  Edit3, 
  Eye, 
  Loader2,
  AlertCircle,
  MoreVertical, 
} from 'lucide-react';
import { FullTask, TaskStatus } from '../../types/task';

interface TaskTableProps {
  tasks: FullTask[];
  onEdit: (task: FullTask) => void;
  onDelete: (id: string) => void;
  onView: (task: FullTask) => void;
  loading?: boolean;
}



// Task'ın süresinin geçip geçmediğini kontrol eder (Gecikmiş mi?)
export const isOverdue = (task: any) => {
  if (!task.deadline || task.status === 'completed' || task.status === 'done') return false;
  return new Date(task.deadline) < new Date();
};

// Task'ın geç tamamlanıp tamamlanmadığını kontrol eder
export const isLateCompleted = (task: any) => {
  if (!task.deadline || (task.status !== 'completed' && task.status !== 'done')) return false;
  // Eğer tamamlanma tarihi, deadline'dan sonraysa "geç bitmiş" sayılır
  // Not: Veritabanında 'completed_at' sütunun olduğunu varsayıyoruz
  return new Date(task.completed_at) > new Date(task.deadline);
};

export const TaskTable: React.FC<TaskTableProps> = ({
  tasks,
  onEdit,
  onDelete,
  onView,
  loading = false
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const filteredTasks = useMemo(() => {
    let filtered = tasks.filter(task =>
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (statusFilter !== 'all') {
      filtered = filtered.filter(task => task.status === statusFilter);
    }

    return filtered;
  }, [tasks, searchQuery, statusFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, tasks.length]);

  const totalPages = Math.max(1, Math.ceil(filteredTasks.length / pageSize));
  const pagedTasks = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTasks.slice(start, start + pageSize);
  }, [filteredTasks, currentPage]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('tr-TR');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-silver-500 mr-3" />
        <span className="text-silver-500">Yükleniyor...</span>
      </div>
    );
  }

  const STATUS_BADGE_CLASSES: Record<TaskStatus, string> = {
  backlog: 'bg-gray-500/20 text-gray-400 ring-gray-500/30',
  started: 'bg-yellow-500/20 text-yellow-400 ring-yellow-500/30',
  in_progress: 'bg-orange-500/20 text-orange-400 ring-orange-500/30',
  completed: 'bg-green-500/20 text-green-400 ring-green-500/30',
  done: 'bg-emerald-500/20 text-emerald-400 ring-emerald-500/30',
};


  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-silver-600" />
          <input
            type="text"
            placeholder="Görev ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white/[0.03] border border-white/10 text-silver-100 placeholder-silver-700 focus:ring-1 focus:ring-ice-500/20 focus:border-ice-500/50 transition-all"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-silver-600" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as TaskStatus | 'all')}
            className="pl-10 pr-8 py-2.5 rounded-lg bg-white/[0.03] border border-white/10 text-silver-100 focus:ring-1 focus:ring-ice-500/20 focus:border-ice-500/50 transition-all appearance-none"
          >
            <option value="all">Tüm Durumlar</option>
            <option value="backlog">Beklemede</option>
            <option value="started">Başlandı</option>
            <option value="in_progress">Devam Ediyor</option>
            <option value="completed">Tamamlandı</option>
            <option value="done">Bitti</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-white/10 bg-coal-800/50 backdrop-blur-xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/5">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-silver-400">Görev</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-silver-400">Atanan</th>
                <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider text-silver-400">Puan</th>
                <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider text-silver-400">Son Tarih</th>
                <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider text-silver-400">Durum</th>
                <th className="w-32 px-4 py-4 text-center text-xs font-bold uppercase tracking-wider text-silver-400">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {pagedTasks.map((task) => {
                const isOverdueTask = isOverdue(task);
                const isLateComp = isLateCompleted(task);
                return (
                  <tr 
                    key={task.id}
                    className={`group hover:bg-white/5 transition-colors ${
                      isOverdueTask ? 'border-l-4 border-red-500/50 bg-red-500/5' : ''
                    }`}
                  >
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-silver-100 group-hover:text-white">{task.title}</div>
                        {task.description && (
                             <div className="mt-2 space-y-1">
                         <p className="text-xs text-silver-500 text-left leading-relaxed">
                           {task.description.length > 50 
                              ? `${task.description.substring(0, 50)}...` 
                      : task.description}
                          </p>
    
                         {task.description.length > 50 && (
                                  <div className="flex justify-end">
                            <span className="text-[10px] text-ice-400 font-semibold bg-ice-400/5 px-1.5 py-0.5 rounded border border-ice-400/20">
                             ...
                                 </span>
                                     </div>
                              )}
                       </div>
                      )}
                        {/*<div className="text-xs text-silver-500 mt-1 line-clamp-2">{task.description}</div>*/}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {task.assignee_id ? (
                        <div className="flex items-center justify-center gap-2 text-xs">
                          {/*<div className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center">
                            <User className="w-3 h-3 text-white" />
                          </div>*/}
                          <img src={task.members?.avatar} alt={task.members?.name} className="h-10 w-10 rounded-full object-cover ring-2 ring-white/10 mb-3" />
                          <span className="text-silver-400">{task.members?.name} Atandı</span>
                        </div>
                      ) : (
                        <span className="text-silver-500 px-2 py-1 bg-white/5 rounded-full text-xs">Boş</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-gradient-to-r from-emerald-500/10 to-emerald-600/10 text-emerald-400 text-sm font-bold border border-emerald-500/20">
                        {task.points}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {task.deadline ? (
                        <div className={`text-xs font-medium px-2 py-1 rounded-full ${
                          isOverdueTask 
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30 font-bold' 
                            : 'text-silver-400'
                        }`}>
                          {formatDate(task.deadline)}
                        </div>
                      ) : (
                        <span className="text-silver-500 text-xs">Yok</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {/*<span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold capitalize bg-${getStatusColor(task.status)}! -500/20 text-${getStatusColor(task.status)}! -400 ring-1 ring-${getStatusColor(task.status)}! -500/30`}>
                        {task.status.replace('_', ' ')}
                      </span>*/}
                      <div className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ring-1 ${STATUS_BADGE_CLASSES[task.status]}`}>
                          {task.status.replace('_', ' ').toUpperCase()}
                        </div>
                      {isLateComp && (
                        <div className="mt-1 inline-flex items-center gap-1 px-2 py-1 rounded-md bg-red-500/20 text-xs font-semibold text-red-400 ring-1 ring-red-500/30">
                          Geç Tamamlandı
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button
                          onClick={() => onView(task)}
                          title="Detay"
                          className="p-1.5 rounded-lg text-silver-500 hover:text-ice-400 hover:bg-ice-500/10 transition-all"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => onEdit(task)}
                          title="Düzenle"
                          className="p-1.5 rounded-lg text-silver-500 hover:text-ice-400 hover:bg-ice-500/10 transition-all"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => onDelete(task.id)}
                          title="Sil"
                          className="p-1.5 rounded-lg text-silver-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="w-6 h-6 opacity-20 group-hover:opacity-100 mx-auto">
                        <MoreVertical className="h-4 w-4 text-silver-500" />
                      </div>
                    </td>
                  </tr>
                );
              })}
              {pagedTasks.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <AlertCircle className="h-12 w-12 text-silver-600 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-bold text-silver-400 mb-1">Görev bulunamadı</h3>
                    <p className="text-sm text-silver-600">Arama kriterlerinizi değiştirin veya yeni görev ekleyin.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-white/10 bg-white/5 px-6 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-sm text-silver-400">
          <div>
            {filteredTasks.length > 0 ? (
              <span>
                {`${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, filteredTasks.length)} / ${filteredTasks.length} görev gösteriliyor`}
              </span>
            ) : (
              <span>Her sayfada en fazla 10 görev gösterilir.</span>
            )}
          </div>
          <div className="inline-flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              className="rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50 hover:bg-white/5"
            >
              Önceki
            </button>
            <span className="min-w-[4rem] text-center">{`${currentPage} / ${totalPages}`}</span>
            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              className="rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50 hover:bg-white/5"
            >
              Sonraki
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

