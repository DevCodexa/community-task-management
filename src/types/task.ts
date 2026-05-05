/* ===========================================================
   Task Type Definitions - Zincir Atarlı Task Management
   =========================================================== */

// -----------------------------------------------------------
// 1. ENUM TYPES
// -----------------------------------------------------------

export type TaskStatus = 'backlog' | 'started' | 'in_progress' | 'completed' | 'done';

export const TASK_STATUS_VALUES: TaskStatus[] = ['backlog', 'started', 'in_progress', 'completed', 'done'];

export const STATUS_COLORS: Record<TaskStatus, string> = {
  backlog: 'gray',
  started: 'yellow',
  in_progress: 'orange',
  completed: 'green',
  done: 'darkgreen'
} as const;

// -----------------------------------------------------------
// 2. MAIN ENTITY INTERFACE
// -----------------------------------------------------------

export interface FullTask {
  id: string;
  title: string;
  description: string;
  deadline: string | null;
  image_url: string;
  points: number;
  assignee_id: string | null;
  status: TaskStatus;
  created_at: string;
  updated_at: string;
// İlişkili üye verisi (members tablosundaki gerçek kolon isimleri: name, avatar, comm_title)
  members?: {
    name: string;
    avatar: string;
    comm_title?: string;
  } | null;
}

// -----------------------------------------------------------
// 3. FORM / QUERY TYPES
// -----------------------------------------------------------

export interface TaskFormData {
  title: string;
  description?: string;
  deadline?: string | null;
  image_url?: string;
  points?: number;
  assignee_id?: string | null;
  status?: TaskStatus;
}

export interface TaskQueryParams {
  search?: string;
  assignee_id?: string;
  status?: TaskStatus;
  page?: number;
  limit?: number;
  sortBy?: keyof FullTask;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedTasksResponse {
  data: FullTask[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// -----------------------------------------------------------
// 4. STATS & ERRORS
// -----------------------------------------------------------

export interface TaskStats {
  totalTasks: number;
  activeTasks: number;
  overdueTasks: number;
  completedTasks: number;
  backlogTasks: number;
  avgPoints: number;
  membersWithTasks: number;
}

export interface TaskError {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// -----------------------------------------------------------
// 5. VISUAL LOGIC HELPERS (Hatalar Giderildi)
// -----------------------------------------------------------

/**
 * Görev süresi geçmiş mi? (Aktif görevler için)
 */
export const isOverdue = (task: FullTask): boolean => {
  const activeStatuses: TaskStatus[] = ['started', 'in_progress'];
  if (!activeStatuses.includes(task.status) || !task.deadline) return false;
  return new Date(task.deadline) < new Date();
};

/**
 * Geç mi tamamlandı? (Biten görevler için)
 */
export const isLateCompleted = (task: FullTask): boolean => {
  const completedStatuses: TaskStatus[] = ['completed', 'done'];
  if (!completedStatuses.includes(task.status) || !task.deadline) return false;
  
  // Tamamlanma tarihi (updated_at) bitiş tarihinden sonraysa geç kalmıştır
  return new Date(task.updated_at) > new Date(task.deadline);
};

export const TASK_DEFAULTS = {
  points: 1,
  status: 'backlog' as TaskStatus,
  image_url: '',
  description: '',
} as const;

export const TASK_LIMITS = {
  max_points: 100,
  title_min: 2,
  title_max: 200,
} as const;