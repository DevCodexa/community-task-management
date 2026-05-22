import { supabase } from './supabase';
import { TaskError } from '../types/task';

const handleError = (error: any): TaskError => {
  console.error('Supabase Tasks Restore Error:', error);
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

/**
 * archived_tasks içinden task'ı geri alır:
 * - archived_tasks tablosundan okur
 * - tasks tablosuna insert eder
 * - archived_tasks kaydını siler
 *
 * Requirement: DB'de archived_tasks ve tasks şemaları uyumlu alanlara sahip olmalı.
 */
export const restoreArchivedTaskToDone = async (
  archivedTaskId: string,
): Promise<{ restored: boolean }> => {
  // read archived task
  const { data: archivedTask, error: archivedErr } = await supabase
    .from('archived_tasks')
    .select(
      `id, title, description, deadline, image_url, points, assignee_id, status,
       created_at, updated_at, done_completed_at, done_completed_by, archived_reason, archived_at`,
    )
    .eq('id', archivedTaskId)
    .single();

  if (archivedErr) throwError(archivedErr);
  if (!archivedTask) throw new Error('Arşiv kaydı bulunamadı');

  // insert into tasks
  const { data: inserted, error: insertErr } = await supabase
    .from('tasks')
    .insert([
      {
        id: archivedTask.id,
        title: archivedTask.title,
        description: archivedTask.description ?? '',
        deadline: archivedTask.deadline,
        image_url: archivedTask.image_url ?? '',
        points: archivedTask.points ?? 1,
        assignee_id: archivedTask.assignee_id,
        status: 'done',
        created_at: archivedTask.created_at,
        updated_at: archivedTask.done_completed_at ?? archivedTask.updated_at ?? new Date().toISOString(),
      },
    ])
    .select('id')
    .single();

  if (insertErr) throwError(insertErr);

  // delete from archive
  const { error: deleteErr } = await supabase
    .from('archived_tasks')
    .delete()
    .eq('id', archivedTaskId);

  if (deleteErr) throwError(deleteErr);

  return { restored: !!inserted?.id };
};

