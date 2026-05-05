 /* ============================================================
   Useful Links CRUD Service - Zincir Atarlı Task Management
   ============================================================ */

import { supabase } from './supabase';

// -----------------------------------------------------------
// 1. TYPES
// -----------------------------------------------------------

export interface UsefulLink {
  id: string;
  title: string;
  url: string;
  description: string;
  category_name: string;
  created_at: string;
  updated_at: string;
}

export interface UsefulLinkFormData {
  title: string;
  url: string;
  description?: string;
  category_name: string;
}

export interface LinkQueryParams {
  search?: string;
  category?: string;
  page?: number;
  limit?: number;
  sortBy?: keyof UsefulLink;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedLinksResponse {
  data: UsefulLink[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface UsefulLinkError {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
}

export interface GroupedLinks {
  category: string;
  links: UsefulLink[];
  count: number;
}

// -----------------------------------------------------------
// 2. HELPERS & ERROR HANDLERS
// -----------------------------------------------------------

const handleError = (error: any): UsefulLinkError => {
  console.error('Supabase UsefulLink Error:', error);
  return {
    message: error?.message || 'Bilinmeyen hata oluştu',
    code: error?.code,
    details: error?.details,
    hint: error?.hint,
  };
};

const throwError = (error: any): never => {
  const linkError = handleError(error);
  throw new Error(linkError.message);
};

// -----------------------------------------------------------
// 3. VALIDATION
// -----------------------------------------------------------

export const validateLinkData = (data: Partial<UsefulLinkFormData>): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (data.title !== undefined) {
    if (!data.title.trim()) errors.push('Başlık zorunludur');
    else if (data.title.trim().length < 2) errors.push('Başlık en az 2 karakter');
    else if (data.title.trim().length > 200) errors.push('Başlık en fazla 200 karakter');
  }

  if (data.url !== undefined) {
    if (!data.url.trim()) errors.push('URL zorunludur');
    else if (data.url.trim().length < 5) errors.push('URL en az 5 karakter');
    else if (!/^https?:\/\/.+/.test(data.url.trim())) errors.push('Geçerli bir URL giriniz');
  }

  if (data.category_name !== undefined) {
    if (!data.category_name.trim()) errors.push('Kategori zorunludur');
    else if (data.category_name.trim().length < 2) errors.push('Kategori en az 2 karakter');
    else if (data.category_name.trim().length > 100) errors.push('Kategori en fazla 100 karakter');
  }

  return { valid: errors.length === 0, errors };
};

// -----------------------------------------------------------
// 4. READ OPERATIONS
// -----------------------------------------------------------

export const getUsefulLinks = async (params?: LinkQueryParams): Promise<PaginatedLinksResponse> => {
  const {
    search, category, page = 1, limit = 50, sortBy = 'created_at', sortOrder = 'desc'
  } = params || {};

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase.from('useful_links').select('*', { count: 'exact' });

  if (search) query = query.ilike('title', `%${search}%`);
  if (category) query = query.eq('category_name', category);

  query = query.order(sortBy, { ascending: sortOrder === 'asc' }).range(from, to);

  const { data, error, count } = await query;
  if (error) throwError(error);

  return {
    data: data || [],
    total: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
    hasNext: page * limit < (count || 0),
    hasPrev: page > 1,
  };
};

export const getUsefulLinkById = async (id: string): Promise<UsefulLink | null> => {
  const { data, error } = await supabase.from('useful_links').select('*').eq('id', id).single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throwError(error);
  }
  return data;
};

export const getAllUsefulLinks = async (): Promise<UsefulLink[]> => {
  const { data, error } = await supabase.from('useful_links').select('*').order('category_name', { ascending: true }).order('created_at', { ascending: false });
  if (error) throwError(error);
  return data || [];
};

export const getCategories = async (): Promise<string[]> => {
  const { data, error } = await supabase.from('useful_links').select('category_name').order('category_name', { ascending: true });
  if (error) throwError(error);
  
  // Get unique categories
  const uniqueCategories = new Set((data || []).map(link => link.category_name));
  return Array.from(uniqueCategories);
};

// -----------------------------------------------------------
// 5. CREATE / UPDATE / DELETE
// -----------------------------------------------------------

export const createUsefulLink = async (linkData: UsefulLinkFormData): Promise<UsefulLink> => {
  const { data, error } = await supabase.from('useful_links').insert([{
    title: linkData.title.trim(),
    url: linkData.url.trim(),
    description: linkData.description?.trim() || '',
    category_name: linkData.category_name.trim()
  }]).select().single();

  if (error) throwError(error);
  return data;
};

export const updateUsefulLink = async (id: string, updateData: Partial<UsefulLinkFormData>): Promise<UsefulLink> => {
  const { data, error } = await supabase.from('useful_links').update({
    ...(updateData.title !== undefined && { title: updateData.title.trim() }),
    ...(updateData.url !== undefined && { url: updateData.url.trim() }),
    ...(updateData.description !== undefined && { description: updateData.description?.trim() || '' }),
    ...(updateData.category_name !== undefined && { category_name: updateData.category_name.trim() }),
  }).eq('id', id).select().single();

  if (error) throwError(error);
  return data;
};

export const deleteUsefulLink = async (id: string): Promise<void> => {
  const { error } = await supabase.from('useful_links').delete().eq('id', id);
  if (error) throwError(error);
};

// -----------------------------------------------------------
// 6. GROUPING LOGIC (Frontend Helpers)
// -----------------------------------------------------------

/**
 * Groups links by category_name alphabetically
 * Returns sorted array of GroupedLinks
 */
export const groupLinksByCategory = (links: UsefulLink[]): GroupedLinks[] => {
  const grouped = new Map<string, UsefulLink[]>();
  
  // Group links by category
  links.forEach(link => {
    const category = link.category_name;
    if (!grouped.has(category)) {
      grouped.set(category, []);
    }
    grouped.get(category)!.push(link);
  });
  
  // Convert to array and sort alphabetically
  const result: GroupedLinks[] = Array.from(grouped.entries())
    .map(([category, categoryLinks]) => ({
      category,
      links: categoryLinks,
      count: categoryLinks.length,
    }))
    .sort((a, b) => a.category.localeCompare(b.category, 'tr')); // Turkish locale for proper sorting
  
  return result;
};

// -----------------------------------------------------------
// 7. STATS
// -----------------------------------------------------------

export interface UsefulLinkStats {
  totalLinks: number;
  totalCategories: number;
}

export const getUsefulLinkStats = async (): Promise<UsefulLinkStats> => {
  const { data, error } = await supabase.from('useful_links').select('category_name');
  if (error) throwError(error);

  const links = data || [];
  const uniqueCategories = new Set(links.map(link => link.category_name));

  return {
    totalLinks: links.length,
    totalCategories: uniqueCategories.size,
  };
};
