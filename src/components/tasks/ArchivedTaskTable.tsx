import React, { useEffect, useMemo, useState } from 'react';
import {
  Search,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { ArchivedTask } from '../../types/taskArchive';

interface ArchivedTaskTableProps {
  tasks: ArchivedTask[];
  loading?: boolean;

  currentPage: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

export const ArchivedTaskTable: React.FC<ArchivedTaskTableProps> = ({
  tasks,
  loading = false,
  currentPage,
  pageSize,
  total,
  onPageChange,
}) => {

  const [searchQuery, setSearchQuery] = useState('');

  const filteredTasks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return tasks;
    return tasks.filter((t) => {
      return (
        t.title.toLowerCase().includes(q) ||
        (t.description || '').toLowerCase().includes(q) ||
        (t.members?.name || '').toLowerCase().includes(q)
      );
    });
  }, [tasks, searchQuery]);

  useEffect(() => {
    // keep page reset possible in future
  }, [searchQuery]);

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('tr-TR');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-silver-500 mr-3" />
        <span className="text-silver-500">Arşiv yükleniyor...</span>
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const formatRangeLabel = () => {
    if (filteredTasks.length === 0) return `0 / 0 arşiv kaydı`;
    const start = (currentPage - 1) * pageSize + 1;
    const end = Math.min(currentPage * pageSize, total);
    return `${start}-${end} / ${total} kayıt gösteriliyor`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">

        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-silver-600" />
          <input
            type="text"
            placeholder="Arşivde ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white/[0.03] border border-white/10 text-silver-100 placeholder-silver-700 focus:ring-1 focus:ring-ice-500/20 focus:border-ice-500/50 transition-all"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-coal-800/50 backdrop-blur-xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/5">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-silver-400">
                  Görev
                </th>
                <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider text-silver-400">
                  Atanan
                </th>
                <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider text-silver-400">Puan</th>
                <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider text-silver-400">Son Tarih</th>
                <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider text-silver-400">Durum</th>
                <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider text-silver-400">
                  Tamamlandı
                </th>
                <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider text-silver-400">
                  Tamamlayan
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <AlertCircle className="h-12 w-12 text-silver-600 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-bold text-silver-400 mb-1">Arşivde kayıt yok</h3>
                    <p className="text-sm text-silver-600">Şartları sağlayan tamamlanmış görevleri bekleyin.</p>
                  </td>
                </tr>
              ) : (
                filteredTasks.map((task) => (
                  <tr
                    key={task.id}
                    className="group hover:bg-white/5 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-silver-100 group-hover:text-white">{task.title}</div>
                        {task.description ? (
                          <div className="mt-2">
                            <p className="text-xs text-silver-500 text-left leading-relaxed">
                              {task.description.length > 60 ? `${task.description.substring(0, 60)}...` : task.description}
                            </p>
                          </div>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {task.assignee_id ? (
                        <div className="text-xs text-silver-400">
                          {task.members?.name || 'Atandı'}
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
                        <span className="text-xs font-medium text-silver-400">{formatDate(task.deadline)}</span>
                      ) : (
                        <span className="text-silver-500 text-xs">Yok</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ring-1 bg-emerald-500/20 text-emerald-400 ring-emerald-500/30">
                        DONE
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-xs text-silver-300">{formatDate(task.done_completed_at)}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-xs text-silver-300">
                        {task.done_completed_by_name || 'Bilinmiyor'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-white/10 bg-white/5 px-6 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-sm text-silver-400">
          <div>
            {filteredTasks.length > 0 ? (
              <span>{formatRangeLabel()}</span>
            ) : (
              <span>Arşivde kayıt yok</span>
            )}
          </div>
          <div className="inline-flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              className="rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50 hover:bg-white/5"
            >
              Önceki
            </button>
            <span className="min-w-[4rem] text-center">{`${currentPage} / ${totalPages}`}</span>
            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
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


