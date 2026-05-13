import React, { useState, useEffect, } from 'react';
import { useUserProfile } from '../../context/UserProfileContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FullTask, 
  TaskStatus, 
  TASK_STATUS_VALUES, 
  isOverdue, 
  isLateCompleted 
} from '../../types/task';
import { getTasks,  updateTask as supabaseUpdateTask, deleteTask as supabaseDeleteTask, getMembersTaskCounts } from '../../lib/supabaseTasks';
import { Clock, Calendar, Edit3, Trash2, Eye, AlertTriangle, Star } from 'lucide-react';
import { TaskFormModal } from '../tasks/TaskFormModal';
import { TaskDetailsModal } from '../tasks/TaskDetailsModal';

const COLUMNS = [
  { id: 'backlog', title: 'Beklemede', color: 'gray' },
  { id: 'started', title: 'Başlandı', color: 'yellow' },
  { id: 'in_progress', title: 'Devam Ediyor', color: 'orange' },
  { id: 'completed', title: 'Tamamlandı', color: 'green' },
  { id: 'done', title: 'Bitti', color: 'emerald' },
] as const;

const STATUS_BADGE_CLASSES: Record<TaskStatus, string> = {
  backlog: 'bg-gray-500/20 text-gray-400 ring-gray-500/30',
  started: 'bg-yellow-500/20 text-yellow-400 ring-yellow-500/30',
  in_progress: 'bg-orange-500/20 text-orange-400 ring-orange-500/30',
  completed: 'bg-green-500/20 text-green-400 ring-green-500/30',
  done: 'bg-emerald-500/20 text-emerald-400 ring-emerald-500/30',
};

export const KanbanBoard: React.FC = () => {
  const { isAuthenticated, isLoading: authLoading } = useUserProfile();
  
  const [tasks, setTasks] = useState<FullTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [columns, setColumns] = useState<Record<TaskStatus, FullTask[]>>({} as any);
  const [selectedTask, setSelectedTask] = useState<FullTask | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [viewedTask, setViewedTask] = useState<FullTask | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [memberTaskCounts, setMemberTaskCounts] = useState<Record<string, number>>({});

useEffect(() => {
    console.log('Kanban useEffect:', {isAuthenticated, authLoading});
    if (isAuthenticated && !authLoading) {
      console.log('Auth OK - fetching tasks');
      fetchTasks();
    }
  }, [isAuthenticated, authLoading]);

  // Fetch task counts for all members with tasks
  const fetchMemberTaskCounts = async () => {
    try {
      const memberIds = [...new Set(tasks.map(t => t.assignee_id).filter(Boolean))] as string[];
      if (memberIds.length > 0) {
        const counts = await getMembersTaskCounts(memberIds);
        setMemberTaskCounts(counts);
      }
    } catch (err) {
      console.error('Üye görev sayıları yüklenemedi:', err);
    }
  };

const fetchTasks = async () => {
    console.log('fetchTasks called');
    try {
      setLoading(true);
      setError(null);
      const response = await getTasks();
      console.log('getTasks response:', response);
      const data = response.data;
      console.log('getTasks data:', data ? data.length : 0);
      setTasks(data || []);
      groupTasks(data || []);
      await fetchMemberTaskCounts();
    } catch (error: any) {
      console.error('fetchTasks error:', error);
      setError(error.message || 'Görevler yüklenirken hata oluştu. Lütfen sayfayı yenileyin.');
    } finally {
      setLoading(false);
    }
  };

  const groupTasks = (taskList: FullTask[]) => {
    const newColumns: any = {};
    TASK_STATUS_VALUES.forEach(status => {
      newColumns[status] = taskList.filter(task => task.status === status);
    });
    setColumns(newColumns);
  };

const handleEditTask = (task: FullTask) => {
    setSelectedTask(task);
    setIsFormOpen(true);
  };

  const handleViewTask = (task: FullTask) => {
    setViewedTask(task);
    setIsDetailsOpen(true);
  };

  const handleDeleteTask = async (id: string) => {
    if (!window.confirm('Bu görevi silmek istediğinize emin misiniz?')) return;
    try {
      await supabaseDeleteTask(id);
      await fetchTasks();
    } catch (error) {
      console.error('Silme başarısız:', error);
    }
  };

  // --- DRAG & DROP MANTIĞI (Düzeltilmiş Kısım) ---

  // Framer Motion'ın sarmalayıcı hatasını aşmak için event tipini 'any' yapıyoruz
  // veya direkt standart HTML sürükleme event'ine zorluyoruz.
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

const onDrop = async (e: React.DragEvent<HTMLDivElement>, columnId: TaskStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    const task = tasks.find(t => t.id === taskId);
    
    if (!task || task.status === columnId) return;

    // ATAMA ZORUNLULUĞU KONTROLÜ:
    // Eğer görev 'backlog' sütunundan başka bir sütuna sürükleniyorsa
    // ve görevde biri atanmamışsa, işlemi durdur ve modalı aç
    if (task.status === 'backlog' && columnId !== 'backlog') {
      const isAssigned = task.assignee_id && task.assignee_id.trim() !== '';
      
      if (!isAssigned) {
        // Kullanıcıyı bilgilendir
        window.alert('Bu görevi başlatmak için önce birini atamalısınız!');
        // Edit modalı aç
        handleEditTask(task);
        // Status güncelleme işlemini durdur
        return;
      }
    }

    // KAPASİTE KONTROLÜ (YENİ):
    // Eğer görev atanmış bir üyeye aitse ve üyenin kapasitesi doluysa, 
    // görevi başlatma/in progress'e alamaz
    if (task.assignee_id && ['started', 'in_progress'].includes(columnId)) {
      const currentCount = memberTaskCounts[task.assignee_id] || 0;
      const maxCapacity = 4;
      
      if (currentCount >= maxCapacity) {
        // Üye kapasitesi dolu - işlemi reddet
        window.alert(`Bu üye yeni görev kabul edemez. Mevcut işlerini bitirmesi veya iptal etmesi gerekiyor.\n\nMevcut Yük: ${currentCount}/${maxCapacity}`);
        return;
      }
    }

    // Normal akış: Status güncelle
    try {
      await supabaseUpdateTask(task.id, { status: columnId });
      await fetchTasks();
    } catch (error) {
      console.error('Görev güncellenemedi:', error);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
  };

  console.log('Render - authLoading:', authLoading, 'isAuthenticated:', isAuthenticated, 'loading:', loading, 'tasks.length:', tasks.length);
  
  if (authLoading) {
    return <div className="flex h-64 items-center justify-center text-silver-500">Kimlik doğrulanıyor...</div>;
  }
  
  if (!isAuthenticated) {
    return <div className="flex h-64 items-center justify-center text-red-400">
      Giriş yapmanız gerekiyor
    </div>;
  }

  if (error) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-silver-100 mb-2">Veriler yüklenemedi</h3>
          <p className="text-silver-500 mb-4">{error}</p>
          <button 
            onClick={fetchTasks}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Tekrar Dene
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="flex h-64 items-center justify-center text-silver-500">Yükleniyor...</div>;
  }

  return (
    <>
      <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-white/20">
        {COLUMNS.map((column) => {
          const colTasks = columns[column.id] || [];
          return (
            <div
              key={column.id}
              className="min-w-[250px] flex-shrink-0 bg-coal-800/50 border border-white/10 rounded-2xl p-6"
              onDragOver={onDragOver}
              onDrop={(e) => onDrop(e, column.id)}
            >
              <div className="mb-6 flex items-center justify-between">
                <h3 className="font-display text-lg font-bold text-silver-100">
                  {column.title} ({colTasks.length})
                </h3>
                <div className={`h-3 w-3 rounded-full bg-${column.color}-400`} />
              </div>

              <div className="space-y-4 min-h-[200px]">
                <AnimatePresence mode="popLayout">
                  {colTasks.map((task) => (
                    <motion.div
                      key={task.id}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      // Framer Motion 'drag' özelliğini kullanmıyoruz (manuel drag yapıyoruz)
                      // Tip hatasını çözmek için 'any' casting yapıyoruz
                      draggable
                      onDragStart={(e: any) => handleDragStart(e, task.id)}
                      className={`group relative rounded-xl p-4 border border-white/20 bg-white/5 backdrop-blur-sm shadow-xl cursor-grab active:cursor-grabbing hover:border-white/40 transition-colors ${
                        isOverdue(task) ? 'ring-2 ring-red-500/30 border-red-400/50 bg-red-500/5' : ''
                      }`}
                    >
                      <div className="space-y-3">
<div className="space-y-1">
  <div className="flex items-start justify-between">
    <h4 className="font-semibold text-silver-100 leading-tight pr-2">
      {task.title.length > 20 
        ? `${task.title.substring(0, 20)}...` 
        : task.title}
    </h4>
    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
      <button onClick={() => handleViewTask(task)} className="p-1 hover:bg-white/10 rounded text-silver-400 hover:text-white" title="Görüntüle">
        <Eye className="h-3.5 w-3.5" />
      </button>
      <button onClick={() => handleEditTask(task)} className="p-1 hover:bg-white/10 rounded text-silver-400 hover:text-white" title="Düzenle">
        <Edit3 className="h-3.5 w-3.5" />
      </button>
      <button onClick={() => handleDeleteTask(task.id)} className="p-1 hover:bg-white/10 rounded text-red-400 hover:text-red-300" title="Sil">
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  </div>
  {/*{task.title.length > 30 && (
    <div className="flex justify-end">
      <span className="text-[10px] text-ice-400 font-semibold bg-ice-400/5 px-1.5 py-0.5 rounded border border-ice-400/20">
        ...
      </span>
    </div>
  )}*/}
</div>

                        {task.description && (
                             <div className="mt-2 space-y-1">
                         <p className="text-xs text-silver-500 text-left leading-relaxed">
                           {task.description.length > 50 
                              ? `${task.description.substring(0, 50)}...` 
                      : task.description}
                          </p>
    
                         {/*{task.description.length > 20 && (
                                  <div className="flex justify-end">
                            <span className="text-[10px] text-ice-400 font-semibold bg-ice-400/5 px-1.5 py-0.5 rounded border border-ice-400/20">
                             ...
                                 </span>
                                     </div>
                              )}*/}
                       </div>
                      )}


                        {task.assignee_id && (
                          <div className="flex items-center gap-2 text-xs text-silver-500">
                             {/*<div className="h-6 w-6 rounded-full bg-gradient-to-r from-ice-500 to-blue-500 flex items-center justify-center">
                             <User className="h-3 w-3 text-white" />
                            </div>*/}
                            <img src={task.members?.avatar} alt={task.members?.name} className="h-10 w-10 rounded-full object-cover ring-2 ring-white/10 mb-3" />
                            
                            <span>{task.members?.name || 'Atandı'}</span>
                          </div>
                        )}
                        
                        

                        <div className="flex flex-wrap gap-2">
                          
                          {task.deadline && (
                            <div className={`flex items-center gap-1.5 text-xs ${isOverdue(task) ? 'text-red-400 font-bold' : 'text-silver-500'}`}>
                              <Calendar className="h-3 w-3" />
                              {formatDate(task.deadline)}
                            </div>
                          )}
                          {isLateCompleted(task) && (
                            <div className="flex items-center gap-1 rounded-md bg-red-500/20 px-2 py-0.5 text-[10px] font-bold text-red-400 ring-1 ring-red-500/30">
                              <Clock className="h-3 w-3" /> GEÇ BİTTİ
                            </div>
                          )}

{task.points && (
                            <div className={`flex items-center gap-1.5 text-xs ${isOverdue(task) ? 'text-red-400 font-bold' : 'text-silver-500'}`}>
                              <Star className="h-3 w-3 text-amber-400 fill-current" />
                              <span>{task.points +' Puan'}</span>
                            </div>
                          )}
                          <div className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ring-1 ${STATUS_BADGE_CLASSES[task.status]}`}>
                          {task.status.replace('_', ' ').toUpperCase()}
                        </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {colTasks.length === 0 && (
                  <div className="h-24 flex flex-col items-center justify-center text-silver-600 rounded-xl border-2 border-dashed border-white/5">
                    <span className="text-xs">Henüz görev yok</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

<TaskFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedTask(null);
        }}
        task={selectedTask}
        onSuccess={fetchTasks}
      />

      <TaskDetailsModal
        isOpen={isDetailsOpen}
        onClose={() => {
          setIsDetailsOpen(false);
          setViewedTask(null);
        }}
        task={viewedTask}
        onEdit={handleEditTask}
      />
    </>
  );
};
