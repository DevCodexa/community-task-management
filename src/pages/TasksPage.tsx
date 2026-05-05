import React, { useState, useEffect,  } from 'react';
import { LayoutList, Kanban, Plus, Trash,  } from 'lucide-react';
import { TaskTable } from '../components/tasks/TaskTable';
import { TaskFormModal } from '../components/tasks/TaskFormModal';
import { TaskDetailsModal } from '../components/tasks/TaskDetailsModal';
import { KanbanBoard } from '../components/kanban/KanbanBoard';
import { FullTask } from '../types/task';
import { getTasks } from '../lib/supabaseTasks';
import { deleteTask } from '../lib/supabaseTasks';

export const TasksPage: React.FC = () => {
  const [tasks, setTasks] = useState<FullTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('kanban');
  const [selectedTask, setSelectedTask] = useState<FullTask | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [viewedTask, setViewedTask] = useState<FullTask | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const { data } = await getTasks();
      setTasks(data || []);
    } catch (error) {
      console.error('Görevler yüklenemedi:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleEdit = (task: FullTask) => {
    setSelectedTask(task);
    setIsFormOpen(true);
  };

  const handleAdd = () => {
    setSelectedTask(null);
    setIsFormOpen(true);
  };

  const handleFormSuccess = () => {
    fetchTasks();
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTask(id);
      fetchTasks();
    } catch (error) {
      console.error('Silme başarısız:', error);
    }
  };

const handleViewTask = (task: FullTask) => {
    setViewedTask(task);
    setIsDetailsOpen(true);
  };

  return (
    <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-silver-100">
            Görev Yönetimi
          </h1>
          <p className="mt-2 text-xl text-silver-500">
            {viewMode === 'kanban' ? 'Kanban görünümü' : 'Tablo görünümü'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleAdd}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-600 hover:to-emerald-700 shadow-lg hover:shadow-xl transition-all"
          >
            <Plus className="h-4 w-4" />
            Yeni Görev
          </button>
          <div className="flex bg-white/5 border border-white/10 rounded-xl p-1">
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-2 rounded-lg transition-all flex items-center gap-1 ${
                viewMode === 'kanban' 
                  ? 'bg-gradient-to-r from-ice-500 to-blue-500 text-white shadow-lg' 
                  : 'text-silver-400 hover:text-silver-200'
              }`}
            >
              <Kanban className="h-4 w-4" />
              <span className="text-xs font-medium">Kanban</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-lg transition-all flex items-center gap-1 ${
                viewMode === 'table' 
                  ? 'bg-gradient-to-r from-ice-500 to-blue-500 text-white shadow-lg' 
                  : 'text-silver-400 hover:text-silver-200'
              }`}
            >
              <LayoutList className="h-4 w-4" />
              <span className="text-xs font-medium">Tablo</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="glass-card rounded-3xl p-1">
        <div className="bg-coal-800/50 rounded-2xl overflow-hidden">
          {viewMode === 'kanban' ? (
            <KanbanBoard />
          ) : (
            <TaskTable
              tasks={tasks}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onView={handleViewTask}
              loading={loading}
            />
          )}
        </div>
      </div>

      {/* Task Form Modal */}
<TaskFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        task={selectedTask}
        onSuccess={handleFormSuccess}
      />

      {/* Task Details Modal */}
      <TaskDetailsModal
        isOpen={isDetailsOpen}
        onClose={() => {
          setIsDetailsOpen(false);
          setViewedTask(null);
        }}
        task={viewedTask}
        onEdit={handleEdit}
      />

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-xl" onClick={() => setDeleteConfirm(null)} />
          <div className="relative w-full max-w-sm bg-coal-900/95 border border-white/10 rounded-2xl p-6 shadow-3xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/20">
                <Trash className="h-5 w-5 text-red-400" />
              </div>
              <h3 className="text-lg font-bold text-white">Görev Sil</h3>
            </div>
            <p className="text-silver-300 mb-6">
              Bu görevi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-white/20 text-silver-400 hover:bg-white/10 transition-all text-sm font-medium"
              >
                İptal
              </button>
              <button
                onClick={() => {
                  handleDelete(deleteConfirm);
                  setDeleteConfirm(null);
                }}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-500/90 hover:bg-red-600 text-white shadow-lg hover:shadow-xl transition-all text-sm font-semibold"
              >
                Sil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

