/* ===========================================================
   Tasks CRUD Service - Zincir Atarlı Task Management
   =========================================================== */

import { supabase } from './supabase';
import {
  canTakeTask,
  incrementActiveTasks,
  decrementActiveTasks,
} from './supabaseMembers';
import {
  FullTask,
  TaskFormData,
  TaskError,
  TaskQueryParams,
  PaginatedTasksResponse,
  TaskStats,
  ValidationResult,
} from '../types/task';

// Re-export TaskFormData for components
export type { TaskFormData } from '../types/task';

// -----------------------------------------------------------
// 1. HELPERS & ERROR HANDLERS (Dışarıya aktarıldı - Export)
// -----------------------------------------------------------

const handleError = (error: any): TaskError => {
  console.error('Supabase Task Error:', error);
  return {
    message: error?.message || 'Bilinmeyen hata oluştu',
    code: error?.code,
    details: error?.details,
    hint: error?.hint,
  };
};

const throwError = (error: any): never => {
  const taskError = handleError(error);
  throw new Error(taskError.message);
};

// Bu fonksiyonlar artık sayfalarda da kullanılabilir
export const isActiveStatus = (status: string): boolean => {
  return ['started', 'in_progress'].includes(status);
};

// Non-completed status listesi (backlog, started, in_progress dahil)
export const NON_COMPLETED_STATUSES = ['backlog', 'started', 'in_progress'];

/**
 * Üyenin toplam non-completed görev sayısını getirir
 * Bu fonksiyon backlog dahil TÜM non-completed (completed/done olmayan) görevleri sayar
 */
export const getMemberTaskCount = async (memberId: string): Promise<number> => {
  const { data, error } = await supabase
    .from('tasks')
    .select('id')
    .eq('assignee_id', memberId)
    .in('status', NON_COMPLETED_STATUSES);

  if (error) throwError(error);
  return data?.length || 0;
};

/**
 * Birden fazla üyenin görev sayılarını tek sorguda getirir (performans için)
 * Map formatında döner: { memberId: count }
 */
export const getMembersTaskCounts = async (memberIds: string[]): Promise<Record<string, number>> => {
  if (!memberIds.length) return {};
  
  const { data, error } = await supabase
    .from('tasks')
    .select('assignee_id')
    .in('assignee_id', memberIds)
    .in('status', NON_COMPLETED_STATUSES);

  if (error) throwError(error);

  // Her üye için say
  const counts: Record<string, number> = {};
  memberIds.forEach(id => counts[id] = 0);
  (data || []).forEach(task => {
    if (task.assignee_id && counts[task.assignee_id] !== undefined) {
      counts[task.assignee_id]++;
    }
  });

  return counts;
};

export const calculateIsLate = (deadline: string | null, status: string): boolean => {
  if (!deadline || ['completed', 'done'].includes(status)) return false;
  const now = new Date();
  const taskDeadline = new Date(deadline);
  return taskDeadline < now;
};

// -----------------------------------------------------------
// 2. VALIDATION
// -----------------------------------------------------------

export const validateTaskData = (data: Partial<TaskFormData>): ValidationResult => {
  const errors: string[] = [];

  if (data.title !== undefined) {
    if (!data.title.trim()) errors.push('Başlık zorunludur');
    else if (data.title.trim().length < 2) errors.push('Başlık en az 2 karakter');
  }

  if (data.points !== undefined) {
    if (data.points < 0 || data.points > 100) errors.push('Puan 0-100 arasında olmalı');
  }

  return { valid: errors.length === 0, errors };
};

// -----------------------------------------------------------
// 3. READ OPERATIONS
// -----------------------------------------------------------

export const ensureAuth = async (): Promise<void> => {
  console.log('ensureAuth called');
  const { data: { session }, error } = await supabase.auth.getSession();
  console.log('Session:', session ? 'exists' : 'null', 'error:', error);
  if (!session) {
    throw new Error('Authentication required. Please log in.');
  }
};

export const getTasks = async (params?: TaskQueryParams): Promise<PaginatedTasksResponse> => {
  await ensureAuth();
  const {
    search, assignee_id, status, page = 1, limit = 50, sortBy = 'created_at', sortOrder = 'desc'
  } = params || {};

  const from = (page - 1) * limit;
  const to = from + limit - 1;

// ÖNEMLİ: Üye bilgilerini de çekmek için join ekledik
  // Not: members tablosunda 'full_name' yerine 'name', 'avatar_url' yerine 'avatar' var
  let query = supabase.from('tasks').select('*, members(name, avatar, comm_title)', { count: 'exact' });

  if (search) query = query.ilike('title', `%${search}%`);
  if (assignee_id) query = query.eq('assignee_id', assignee_id);
  if (status) query = query.eq('status', status);

  query = query.order(sortBy, { ascending: sortOrder === 'asc' }).range(from, to);

  const { data, error, count } = await query;
  if (error) throwError(error);

  return {
    data: data || [],
    total: count || 0,
    page, limit, totalPages: Math.ceil((count || 0) / limit),
    hasNext: page * limit < (count || 0),
    hasPrev: page > 1,
  };
};

export const getTaskById = async (id: string): Promise<FullTask | null> => {
  const { data, error } = await supabase.from('tasks').select('*, members(*)').eq('id', id).single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throwError(error);
  }
  return data;
};

// -----------------------------------------------------------
// 4. CREATE / UPDATE / DELETE
// -----------------------------------------------------------

export const createTask = async (taskData: TaskFormData): Promise<FullTask> => {
  // Normalize empty assignee_id to null (fix UUID error)
  const normalizedData = {
    ...taskData,
    assignee_id: taskData.assignee_id === '' ? null : taskData.assignee_id
  };

  if (normalizedData.assignee_id) {
    const canAssign = await canTakeTask(normalizedData.assignee_id as string);
    if (!canAssign) throw new Error('Üye görev limiti dolu (max 3 aktif)');
  }

  const { data, error } = await supabase.from('tasks').insert([{
    ...normalizedData,
    status: normalizedData.status || 'backlog',
    points: normalizedData.points || 1
  }]).select().single();

  if (error) throwError(error);

  if (data.assignee_id && isActiveStatus(data.status)) {
    await incrementActiveTasks(data.assignee_id);
  }

  // Send email notification to assignee (fire-and-forget - don't await)
  if (data.assignee_id) {
    sendTaskEmailNotification(data.assignee_id, data).catch(err => {
      console.warn('Email notification failed:', err);
    });
  }

  return data;
};

/**
 * Send email notification to task assignee
 * This runs in the background to not block the main operation
 */
const sendTaskEmailNotification = async (
  assigneeId: string,
  task: FullTask
): Promise<void> => {
  try {
    // Get assignee member details
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('name, email')
      .eq('id', assigneeId)
      .single();

    if (memberError || !member?.email) {
      console.warn('Assignee email not found, skipping notification');
      return;
    }

    // Brevo üzerinden email gönder
    const { sendTaskAssignmentEmail } = await import('./brevo');

    console.log('Brevo tetiklendi, alıcı:', member.email);

    
    await sendTaskAssignmentEmail(
      member.email,
      member.name,
      task.title,
      task.description || '',
      task.deadline,
      task.points
    );

    console.log('📧 Task assignment email sent to:', member.email);
  } catch (err) {
    // Log but don't throw - email is optional
    console.warn('Failed to send task assignment email:', err);
  }
};

export const updateTask = async (id: string, updateData: any): Promise<FullTask> => {
  // Normalize empty assignee_id to null (fix UUID error)
  const normalizedData = {
    ...updateData,
    assignee_id: updateData.assignee_id === '' ? null : updateData.assignee_id
  };

  const currentTask = await getTaskById(id);
  if (!currentTask) throw new Error('Görev bulunamadı');

  // assignee_id değiştiyse (özellikle yeni kullanıcıya) mail tetikle
  const assigneeChanged = normalizedData.assignee_id !== undefined && normalizedData.assignee_id !== currentTask.assignee_id;

  // Limit ve aktiflik mantığı kontrolü

  if (normalizedData.status && normalizedData.status !== currentTask.status) {
      const assigneeId = normalizedData.assignee_id || currentTask.assignee_id;
      if (assigneeId) {
          if (isActiveStatus(currentTask.status) && !isActiveStatus(normalizedData.status)) {
              await decrementActiveTasks(assigneeId as string);
          } else if (!isActiveStatus(currentTask.status) && isActiveStatus(normalizedData.status)) {
              const canAssign = await canTakeTask(assigneeId as string);
              if (!canAssign) throw new Error('Üye görev limiti dolu');
              await incrementActiveTasks(assigneeId as string);
          }
      }
  }

  const { data, error } = await supabase.from('tasks').update(normalizedData).eq('id', id).select().single();
  if (error) throwError(error);

  // fire-and-forget: UX'i kilitlemeyelim
  if (assigneeChanged && data?.assignee_id) {
    sendTaskEmailNotification(data.assignee_id, data).catch(err => {
      console.warn('Task assignment email failed:', err);
    });
  }

  return data;
};


export const deleteTask = async (id: string): Promise<void> => {
  const task = await getTaskById(id);
  if (task && task.assignee_id && isActiveStatus(task.status)) {
    await decrementActiveTasks(task.assignee_id);
  }
  const { error } = await supabase.from('tasks').delete().eq('id', id);
  if (error) throwError(error);
};

// -----------------------------------------------------------
// 5. STATS (Filtreleme hatalarını çözen kısım)
// -----------------------------------------------------------

export const getTaskStats = async (): Promise<TaskStats> => {
  const { data: allTasks, error } = await supabase.from('tasks').select('status, deadline, points, assignee_id');
  if (error) throwError(error);

  const tasks = allTasks || [];

  return {
    totalTasks: tasks.length,
    activeTasks: tasks.filter(t => isActiveStatus(t.status)).length,
    overdueTasks: tasks.filter(t => calculateIsLate(t.deadline, t.status)).length,
    completedTasks: tasks.filter(t => ['completed', 'done'].includes(t.status)).length,
    backlogTasks: tasks.filter(t => t.status === 'backlog').length,
    avgPoints: tasks.length ? Math.round((tasks.reduce((sum, t) => sum + (t.points || 0), 0) / tasks.length) * 10) / 10 : 0,
    membersWithTasks: new Set(tasks.map(t => t.assignee_id).filter(Boolean)).size,
  };
};

// -----------------------------------------------------------
// 6. DASHBOARD SERVICE (Yeni Eklenen)
// -----------------------------------------------------------

import { getTotalSpeakers } from './supabaseSpeakers';

export interface DashboardStats {
  totalMembers: number;
  completionRate: number;
  totalEvents: number;
  totalTasks: number;
  totalSpeakers: number;
}


export interface TaskDistributionItem {
  name: string;
  value: number;
  color: string;
}

export interface CompletedTask {
  id: string;
  title: string;
  assigneeName: string | null;
  assigneeAvatar: string | null;
  completedAt: string;
}

/**
 * Dashboard için genel istatistikleri getirir
 */
export const getDashboardStats = async (): Promise<DashboardStats> => {
  // Toplam üye sayısı
  const { count: memberCount, error: memberError } = await supabase
    .from('members')
    .select('*', { count: 'exact', head: true });
  
  if (memberError) throwError(memberError);

  // Toplam görev ve durumları
  const { data: allTasks, error: taskError } = await supabase
    .from('tasks')
    .select('status');
  
  if (taskError) throwError(taskError);

  const tasks = allTasks || [];
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => ['completed', 'done'].includes(t.status)).length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100 * 10) / 10 : 0;

  // Toplam etkinlik (events tablosu varsa, yoksa 0)
  let totalEvents = 0;
  const { count: eventCount } = await supabase
    .from('events')
    .select('*', { count: 'exact', head: true });
  
  if (eventCount !== null && eventCount !== undefined) {
    totalEvents = eventCount;
  } else {
    // announcements tablosunu dene
    const { count: announceCount } = await supabase
      .from('announcements')
      .select('*', { count: 'exact', head: true });
    totalEvents = announceCount || 0;
  }

  // Toplam konuşmacı
  const totalSpeakers = await getTotalSpeakers();

  return {
    totalMembers: memberCount || 0,
    completionRate,
    totalEvents,
    totalTasks,
    totalSpeakers,
  };
};


/**
 * Görev dağılımını durumlarına göre getirir (Chart için)
 */
export const getTaskDistribution = async (): Promise<TaskDistributionItem[]> => {
  const { data: allTasks, error } = await supabase
    .from('tasks')
    .select('status, deadline, updated_at');
  
  if (error) throwError(error);

  const tasks = allTasks || [];

  const distribution: TaskDistributionItem[] = [
    { 
      name: 'Bekleyen (Backlog)', 
      value: tasks.filter(t => t.status === 'backlog').length, 
      color: '#6c757d' 
    },
    { 
      name: 'Başlanan', 
      value: tasks.filter(t => t.status === 'started' && !calculateIsLate(t.deadline, t.status)).length, 
      color: '#4dabf7' 
    },
    { 
      name: 'Devam Eden', 
      value: tasks.filter(t => t.status === 'in_progress' && !calculateIsLate(t.deadline, t.status)).length, 
      color: '#fd7e14' 
    },
    { 
      name: 'Süresi Geçmiş', 
      value: tasks.filter(t => calculateIsLate(t.deadline, t.status)).length, 
      color: '#f87171' 
    },
    { 
      name: 'Geç Tamamlanan', 
      value: tasks.filter(t => ['completed', 'done'].includes(t.status) && t.updated_at && t.deadline && new Date(t.updated_at) > new Date(t.deadline)).length, 
      color: '#dc2626' 
    },
    { 
      name: 'Tamamlanan', 
      value: tasks.filter(t => ['completed', 'done'].includes(t.status) && (!t.deadline || new Date(t.updated_at) <= new Date(t.deadline))).length, 
      color: '#40c057' 
    },
  ];

  return distribution;
};

/**
 * Son tamamlanan görevleri getirir
 */
export const getLatestCompletedTasks = async (limit: number = 5): Promise<CompletedTask[]> => {
  const { data, error } = await supabase
    .from('tasks')
    .select('*, members!inner(name, avatar)')
    .in('status', ['completed', 'done'])
    .order('updated_at', { ascending: false })
    .limit(limit);

  // Debug log raw data
  console.log('Raw completed tasks data:', data);

  if (error) throwError(error);

  return (data || []).map((task: any) => {
    // Robust members parsing - object or array
    let memberName = null;
    let memberAvatar = null;
    
    if (task.members) {
      if (Array.isArray(task.members)) {
        memberName = task.members[0]?.name || null;
        memberAvatar = task.members[0]?.avatar || null;
      } else {
        memberName = task.members.name || null;
        memberAvatar = task.members.avatar || null;
      }
    }
    
    console.log(`Task "${task.title}" member:`, { memberName, memberAvatar });
    
    return {
      id: task.id,
      title: task.title,
      assigneeName: memberName,
      assigneeAvatar: memberAvatar,
      completedAt: task.updated_at,
    };
  });
};
