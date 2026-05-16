import { supabase } from './supabase';
import { ArchivedTask } from '../types/taskArchive';
import { TaskError } from '../types/task';

const handleError = (error: any): TaskError => {
  console.error('Supabase ArchivedTasks Error:', error);
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

export const getArchivedTasks = async (params?: {
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{ data: ArchivedTask[]; total: number }> => {
  const { search, page = 1, limit = 50 } = params || {};
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  // tasks tablosuna göre archived_tasks schema farklı; join ile done_completed_by_name ve assignee members
  // Supabase ilişkileri: archived_tasks.assignee_id -> members
  // archived_tasks.done_completed_by -> members
  // RLS allow anon; ama auth gerekiyorsa da fetch çalışır.

  let query = supabase
    .from('archived_tasks')
    .select(
      `id, title, description, deadline, image_url, points, assignee_id, status, created_at, updated_at, 
       done_completed_at, done_completed_by, archived_at, archived_reason,
       assignee:assignee_id(name, avatar, comm_title),
       done_by:done_completed_by(name, avatar, comm_title)`
    ,
      { count: 'exact' }
    )
    .order('archived_at', { ascending: false })
    .range(from, to);

  if (search?.trim()) {
    query = query.or(
      `title.ilike.%${search.trim()}%,description.ilike.%${search.trim()}%,assignee.name.ilike.%${search.trim()}%,done_by.name.ilike.%${search.trim()}%`
    );
  }

  const { data, error, count } = await query;
  if (error) throwError(error);

  const mapped: ArchivedTask[] = (data || []).map((t: any) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    deadline: t.deadline,
    image_url: t.image_url,
    points: t.points,
    assignee_id: t.assignee_id,
    status: t.status,
    created_at: t.created_at,
    updated_at: t.updated_at,
    done_completed_at: t.done_completed_at,
    done_completed_by: t.done_completed_by,
    archived_at: t.archived_at,
    archived_reason: t.archived_reason,
    done_completed_by_name: t.done_by?.name ?? null,
    members: t.assignee
      ? {
          name: t.assignee.name,
          avatar: t.assignee.avatar,
          comm_title: t.assignee.comm_title,
        }
      : null,
  }));

  return { data: mapped, total: count || 0 };
};

