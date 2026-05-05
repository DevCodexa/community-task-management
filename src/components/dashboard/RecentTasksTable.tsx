import React from 'react';
import { CheckCircle2, HelpCircle } from 'lucide-react';
import { CompletedTask } from '../../lib/supabaseTasks';
interface RecentTasksTableProps {
  tasks: CompletedTask[];
}

export const RecentTasksTable: React.FC<RecentTasksTableProps> = ({ tasks }) => {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const hasTasks = tasks.length > 0;

  // Debug log to check data
  console.log('Recent completed tasks:', tasks.map(t => ({ title: t.title, assigneeName: t.assigneeName, assigneeAvatar: t.assigneeAvatar })));

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-coal-700/30 p-6 backdrop-blur-6m">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.03]">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
        </div>
        <div>
          <h2 className="font-display text-base font-semibold text-silver-100">
            Son Tamamlanan Görevler
          </h2>
          <p className="text-xs text-silver-600">En son tamamlanan 5 görev</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.04]">
              <th className="pb-3 text-left text-xs font-medium uppercase tracking-wider text-silver-600">
                Görev
              </th>
              <th className="pb-3 text-left text-xs font-medium uppercase tracking-wider text-silver-600">
                Tamamlayan
              </th>
              <th className="pb-3 text-right text-xs font-medium uppercase tracking-wider text-silver-600">
                Tarih
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.03]">
            {hasTasks ? (
              tasks.map((task) => (
                <tr
                  key={task.id}
                  className="group transition-colors duration-200 hover:bg-white/[0.02]"
                >
                  <td className="py-3.5">
                    <span className="text-sm font-medium text-silver-200 transition-colors duration-200 group-hover:text-silver-100">
                      {task.title}
                    </span>
                  </td>
                  <td className="py-3.5">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={task.assigneeAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(task.assigneeName || '?')}&background=0D8ABC&color=fff`}
                        alt={task.assigneeName || 'Bilinmeyen'}
                        className="h-7 w-7 rounded-full border border-white/[0.06] object-cover"
                      />
                      <div className="flex items-center gap-1">
                        <span className="text-sm text-silver-500 transition-colors duration-200 group-hover:text-silver-400">
                          {task.assigneeName || 'Bilinmeyen'}
                        </span>
                        {!task.assigneeName && (
                          <HelpCircle className="h-3 w-3 text-silver-400 cursor-help" />
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 text-right">
                    <span className="text-xs text-silver-600">
                      {formatDate(task.completedAt)}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="py-8 text-center text-sm text-silver-600">
                  Henüz tamamlanan görev bulunamadı
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
