import { supabase } from './supabase';
import { TaskError } from '../types/task';

const handleError = (error: any): TaskError => {
  console.error('Supabase Manual Archive Error:', error);
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
 * tasks tablosundan tek bir task'ı manuel arşive taşır ve tasks'tan siler.
 * - Requirement (SQL): archived_tasks tablosu ve şema/kolonlar `database/archive_tasks.sql` ile mevcut olmalı.
 * - Mantık: archived_tasks içine insert + tasks'tan delete.
 */
export const archiveTaskNow = async (taskId: string): Promise<{ moved: boolean }> => {
  // done completed metadata için tasks.updated_at ve auth.uid() kullanıyoruz
  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select('id, title, description, deadline, image_url, points, assignee_id, status, created_at, updated_at')
    .eq('id', taskId)
    .single();

  if (taskError) throwError(taskError);
  if (!task) throw new Error('Görev bulunamadı');

  // tasks durumunu arşiv mantığıyla uyumlu hale getirmek için direkt status üzerinden kaydederiz.
  // (UI butonu genelde completed/done için gösterilecek, ama güvenlik için yine de check şart değil.)

  // Server-side policy bypass için değil; sadece auth.uid() için session'ı kullanıyoruz.
  // RLS "anon" için insert/update/delete policy'leri varsa insert yine de geçer.
  const { data: sessionData } = await supabase.auth.getSession();
  const uid = sessionData.session?.user?.id;
  // RLS patlamaması için uid yoksa da insert denemeyi kapatıyoruz.
  if (!uid) throw new Error('Authentication required');


  const { data: inserted, error: insertError } = await supabase
    .from('archived_tasks')
    .insert([

      {
        id: task.id,
        title: task.title,
        description: task.description ?? '',
        deadline: task.deadline,
        image_url: task.image_url ?? '',
        points: task.points ?? 1,
        assignee_id: task.assignee_id,
        status: task.status,
        done_completed_at: task.updated_at,
        done_completed_by: uid,
        archived_reason: 'manual_done',
        archived_at: new Date().toISOString(),
        created_at: task.created_at,
        updated_at: task.updated_at,
      },
    ])
    .select('id')
    .single();

  if (insertError) throwError(insertError);

  // tasks'tan sil
  const { error: delErr } = await supabase.from('tasks').delete().eq('id', taskId);
  if (delErr) throwError(delErr);

  return { moved: !!inserted?.id };
};


