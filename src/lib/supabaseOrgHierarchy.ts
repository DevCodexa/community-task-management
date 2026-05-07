import { supabase } from './supabase';

// ============================================================
// Org Hierarchy Service
// Departments -> Areas -> Projects
// ============================================================

const throwError = (error: any): never => {
  console.error('Supabase Org Hierarchy Error:', error);
  throw new Error(error?.message || 'Bilinmeyen hata oluştu');
};

// ------------------------------------------------------------
// Types (SQL şemasına uyumlu)
// ------------------------------------------------------------

export type AreaMemberRole = 'LEADER' | 'TEAM_MEMBER';
export type DepartmentMemberRole = 'LEADER' | 'TEAM_MEMBER';

export interface OrgDepartmentMember {
  id: string;
  department_id: string;
  user_id: string;
  role: DepartmentMemberRole;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;

  user?: {
    id: string;
    name: string;
    avatar: string;
    email?: string | null;
  } | null;
}

export interface OrgDepartment {
  id: string;
  name: string;
  description: string | null;
  responsible_person_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;

  responsible_person?: {
    id: string;
    name: string;
    avatar: string;
    email?: string | null;
  } | null;

  members?: OrgDepartmentMember[];
}

export interface OrgAreaMember {
  id: string;
  area_id: string;
  user_id: string;
  role: AreaMemberRole;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;

  user?: {
    id: string;
    name: string;
    avatar: string;
    email?: string | null;
  } | null;
}

export interface OrgArea {
  id: string;
  department_id: string;
  name: string;
  description: string | null;
  area_leader_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;

  area_leader?: {
    id: string;
    name: string;
    avatar: string;
    email?: string | null;
  } | null;

  members?: OrgAreaMember[];
  projects?: { id: string; name: string }[];
}

export interface OrgProject {
  id: string;
  area_id: string;
  name: string;
  description: string | null;
  file_url: string | null;
  external_url: string | null;
  start_date: string | null; // SQL: date
  end_date: string | null; // SQL: date
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export const getProjectMemberCountsByProjectIds = async (projectIds: string[]): Promise<Map<string, number>> => {
  if (!projectIds.length) return new Map();

  const { data, error } = await supabase
    .from('org_project_members')
    .select('project_id')
    .in('project_id', projectIds);

  if (error) {
    // If the project member table does not exist yet, return an empty map and fall back gracefully.
    console.warn('Unable to fetch project member counts:', error.message || error);
    return new Map();
  }

  const counts = new Map<string, number>();
  (data || []).forEach((row: any) => {
    if (!row?.project_id) return;
    counts.set(row.project_id, (counts.get(row.project_id) ?? 0) + 1);
  });

  return counts;
};

// ------------------------------------------------------------
// Departments
// ------------------------------------------------------------

export const getDepartments = async (): Promise<OrgDepartment[]> => {
  // members join (sorumlu kişi ve departman üyeleri)
  const { data, error } = await supabase
    .from('org_departments')
    .select(
      `*,
       responsible_person:members(id, name, avatar, email),
       members:org_department_members(id, user_id, role, created_at, updated_at, deleted_at, user:members(id, name, avatar, email))`
    )
    .order('created_at', { ascending: false });

  if (error) throwError(error);

  return (data || []).map((d: any) => ({
    ...d,
    responsible_person: d.responsible_person ?? null,
    members: (d.members || []).map((m: any) => ({
      ...m,
      user: m.user ?? null,
    })),
  }));
};

export const getDepartmentMembersByDepartmentId = async (departmentId: string): Promise<OrgDepartmentMember[]> => {
  const { data, error } = await supabase
    .from('org_department_members')
    .select(`*, user:members(id, name, avatar, email)`)
    .eq('department_id', departmentId);

  if (error) throwError(error);

  return (data || []).map((m: any) => ({
    ...m,
    user: m.user ?? null,
  }));
};

export const setDepartmentMembers = async (payload: {
  department_id: string;
  memberIds: string[];
  leaderId?: string | null;
}): Promise<void> => {
  const { error: delErr } = await supabase
    .from('org_department_members')
    .delete()
    .eq('department_id', payload.department_id);

  if (delErr) throwError(delErr);

  if (!payload.memberIds.length) return;

  const leaderId = payload.leaderId ?? null;

  const rows = payload.memberIds.map((userId) => ({
    department_id: payload.department_id,
    user_id: userId,
    role: leaderId && leaderId === userId ? 'LEADER' : 'TEAM_MEMBER',
  }));

  const { error: insErr } = await supabase
    .from('org_department_members')
    .insert(rows);

  if (insErr) throwError(insErr);
};

export const createDepartment = async (payload: {
  name: string;
  description?: string | null;
  responsible_person_id: string;
}): Promise<OrgDepartment> => {
  const { data, error } = await supabase
    .from('org_departments')
    .insert([
      {
        name: payload.name,
        description: payload.description ?? null,
        responsible_person_id: payload.responsible_person_id,
      },
    ])
    .select(
      `*,
       responsible_person:members(id, name, avatar, email),
       members:org_department_members(id, user_id, role, created_at, updated_at, deleted_at, user:members(id, name, avatar, email))`
    )
    .single();

  if (error) throwError(error);

  return {
    ...data,
    responsible_person: (data as any).responsible_person ?? null,
    members: (data as any).members?.map((m: any) => ({
      ...m,
      user: m.user ?? null,
    })) ?? [],
  };
};

export const updateDepartment = async (payload: {
  department_id: string;
  name: string;
  description?: string | null;
  responsible_person_id: string;
}): Promise<OrgDepartment> => {
  const { data, error } = await supabase
    .from('org_departments')
    .update({
      name: payload.name,
      description: payload.description ?? null,
      responsible_person_id: payload.responsible_person_id,
    })
    .eq('id', payload.department_id)
    .select(
      `*,
       responsible_person:members(id, name, avatar, email),
       members:org_department_members(id, user_id, role, created_at, updated_at, deleted_at, user:members(id, name, avatar, email))`
    )
    .single();

  if (error) throwError(error);

  return {
    ...data,
    responsible_person: (data as any).responsible_person ?? null,
    members: (data as any).members?.map((m: any) => ({
      ...m,
      user: m.user ?? null,
    })) ?? [],
  };
};

export const deleteDepartment = async (departmentId: string): Promise<void> => {
  const { error } = await supabase
    .from('org_departments')
    .delete()
    .eq('id', departmentId);

  if (error) throwError(error);
};

// ------------------------------------------------------------
// Areas
// ------------------------------------------------------------

export const getAreasByDepartmentId = async (departmentId: string): Promise<OrgArea[]> => {
  // Üst katmandaki department_id ile geri git.
  const { data, error } = await supabase
    .from('org_areas')
    .select(
      `*,
       area_leader:members(id, name, avatar, email),
       projects:org_projects(id, name)`
    )
    .eq('department_id', departmentId)
    .order('created_at', { ascending: false });

  if (error) throwError(error);

  return (data || []).map((a: any) => ({
    ...a,
    area_leader: a.area_leader ?? null,
    members: [],
    projects: a.projects ?? [],
  }));
};

export const createArea = async (payload: {
  department_id: string;
  name: string;
  description?: string | null;
  area_leader_id: string;
}): Promise<OrgArea> => {
  const { data, error } = await supabase
    .from('org_areas')
    .insert([
      {
        department_id: payload.department_id,
        name: payload.name,
        description: payload.description ?? null,
        area_leader_id: payload.area_leader_id,
      },
    ])
    .select(
      `*,
       area_leader:members(id, name, avatar, email)`
    )
    .single();

  if (error) throwError(error);

  return {
    ...data,
    area_leader: (data as any).area_leader ?? null,
    members: [],
  };
};

export const updateArea = async (payload: {
  area_id: string;
  name: string;
  description?: string | null;
  area_leader_id: string;
}): Promise<OrgArea> => {
  const { data, error } = await supabase
    .from('org_areas')
    .update({
      name: payload.name,
      description: payload.description ?? null,
      area_leader_id: payload.area_leader_id,
    })
    .eq('id', payload.area_id)
    .select(
      `*,
       area_leader:members(id, name, avatar, email)`
    )
    .single();

  if (error) throwError(error);

  return {
    ...data,
    area_leader: (data as any).area_leader ?? null,
    members: [],
  };
};

export const deleteArea = async (areaId: string): Promise<void> => {
  // İlişki tabloları için DB cascade yoksa; önce org_area_members temizlenir.
  // (RLS/policy bağlı olarak delete iki adım gerektirebilir.)
  const { error: delMembersErr } = await supabase
    .from('org_area_members')
    .delete()
    .eq('area_id', areaId);

  if (delMembersErr) throwError(delMembersErr);

  const { error: delErr } = await supabase
    .from('org_areas')
    .delete()
    .eq('id', areaId);

  if (delErr) throwError(delErr);
};

// Area üyeleri atanır (many-to-many): org_area_members
// Geri Git mantığı: areaId üzerinden çağrılır.
export const setAreaMembers = async (payload: {
  area_id: string;
  memberIds: string[];
  // İstersen leaderı da opsiyonel veriyoruz. Supabase/DB rol enum’u: LEADER, TEAM_MEMBER
  // Eğer leaderId verilmezse, area_leader_id alanını baz almak yerine UI'nin verdiği set'e göre uygular.
  leaderId?: string | null;
}): Promise<void> => {
  const { error: delErr } = await supabase
    .from('org_area_members')
    .delete()
    .eq('area_id', payload.area_id);

  if (delErr) throwError(delErr);

  if (!payload.memberIds.length) return;

  const leaderId = payload.leaderId ?? null;

  const rows = payload.memberIds.map((userId) => ({
    area_id: payload.area_id,
    user_id: userId,
    role: leaderId && leaderId === userId ? 'LEADER' : 'TEAM_MEMBER',
  }));

  const { error: insErr } = await supabase
    .from('org_area_members')
    .insert(rows);

  if (insErr) throwError(insErr);
};

export const getAreaMembersByAreaId = async (areaId: string): Promise<OrgAreaMember[]> => {
  const { data, error } = await supabase
    .from('org_area_members')
    .select(
      `*,
       user:members(id, name, avatar)`
    )
    .eq('area_id', areaId);

  if (error) throwError(error);

  return (data || []).map((m: any) => ({
    ...m,
    user: m.user ?? null,
  }));
};

// ------------------------------------------------------------
// Projects
// ------------------------------------------------------------

export const getProjectsByAreaId = async (areaId: string): Promise<OrgProject[]> => {
  const { data, error } = await supabase
    .from('org_projects')
    .select('*')
    .eq('area_id', areaId)
    .order('created_at', { ascending: false });

  if (error) throwError(error);

  // SQL date -> string|null olarak geliyor.
  return data || [];
};

export const createProject = async (payload: {
  area_id: string;
  name: string;
  description?: string | null;
  file_url?: string | null;
  external_url?: string | null;
  start_date?: string | null; // 'YYYY-MM-DD'
  end_date?: string | null;
}): Promise<OrgProject> => {
  const { data, error } = await supabase
    .from('org_projects')
    .insert([
      {
        area_id: payload.area_id,
        name: payload.name,
        description: payload.description ?? null,
        file_url: payload.file_url ?? null,
        external_url: payload.external_url ?? null,
        start_date: payload.start_date ?? null,
        end_date: payload.end_date ?? null,
      },
    ])
    .select('*')
    .single();

  if (error) throwError(error);

  return data;
};


export const updateProject = async (payload: {
  project_id: string;
  area_id: string;
  name: string;
  description?: string | null;
  file_url?: string | null;
  external_url?: string | null;
  start_date?: string | null; // 'YYYY-MM-DD'
  end_date?: string | null; // 'YYYY-MM-DD'
}): Promise<OrgProject> => {
  const { data, error } = await supabase
    .from('org_projects')
    .update({
      area_id: payload.area_id,
      name: payload.name,
      description: payload.description ?? null,
      file_url: payload.file_url ?? null,
      external_url: payload.external_url ?? null,
      start_date: payload.start_date ?? null,
      end_date: payload.end_date ?? null,
    })
    .eq('id', payload.project_id)
    .select('*')
    .single();

  if (error) throwError(error);

  return data;
};

export const deleteProject = async (projectId: string): Promise<void> => {
  const { error } = await supabase
    .from('org_projects')
    .delete()
    .eq('id', projectId);

  if (error) throwError(error);
};


