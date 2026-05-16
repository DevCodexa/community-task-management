import { TaskStatus } from './task';

export interface ArchivedTask {
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

  // done metadata (copied from tasks.updated_at/status change time)
  done_completed_at: string;
  done_completed_by: string | null;
  done_completed_by_name?: string | null;

  // archive metadata
  archived_at: string;
  archived_reason: string;

  // optional join for assignee
  members?: {
    name: string;
    avatar: string;
    comm_title?: string;
  } | null;
}

