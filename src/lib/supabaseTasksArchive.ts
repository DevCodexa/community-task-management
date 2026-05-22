import { supabase } from './supabase';
import { ArchivedTask } from '../types/taskArchive';
import { TaskError } from '../types/task';

const toTaskError = (error: any): TaskError => ({
  message: error?.message || 'Bilinmeyen hata oluştu',
  code: error?.code,
  details: error?.details,
  hint: error?.hint,
});

const throwError = (error: any): never => {
  const taskError = toTaskError(error);
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

  // NOTE: archived_tasks şemasında done_completed_by ve assignee_id kolonu members(id)'e FK.
  // Bu yüzden join alan adları, foreign key ilişkilerinin Supabase tarafındaki embed isimlerine bağlıdır.
  // Burada en yaygın embed adlarını (assignee / done_by) include ediyoruz.
  // Eğer embed adları farklıysa UI alanları boş kalabilir; fakat ana task alanları yine gelir.
  let query = supabase
    .from('archived_tasks')
    .select(
      `
      id, title, description, deadline, image_url, points, assignee_id, status,
      created_at, updated_at,
      done_completed_at, done_completed_by,
      archived_at, archived_reason,
      assignee:members(name, avatar, comm_title),
      done_by:members(name, avatar, comm_title)
      `,
      { count: 'exact' }
    )
    .order('archived_at', { ascending: false })
    .range(from, to);

  if (search?.trim()) {
    const s = search.trim();
    query = query.or(`title.ilike.%${s}%,description.ilike.%${s}%`);
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

  return { data: mapped, total: count ?? 0 };
};


