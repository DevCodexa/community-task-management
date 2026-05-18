import type { EmailQueueItem } from './types';

function renderWithParams(template: string, params: Record<string, string>): string {
  // Matches {{key}}
  return template.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_match: string, key: string) => {
    const trimmedKey = String(key).trim();
    return Object.prototype.hasOwnProperty.call(params, trimmedKey) ? params[trimmedKey] : '';
  });
}

export function renderTemplate(html: string, params: Record<string, string>): string {
  return renderWithParams(html, params);
}

export function renderSubject(subject: string, params: Record<string, string>): string {
  return renderWithParams(subject, params);
}

export function normalizeTemplateParams(params: EmailQueueItem['template_params']): Record<string, string> {
  // Ensures Record<string,string> (Supabase jsonb may come as any/unknown)
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(params ?? {})) {
    out[k] = typeof v === 'string' ? v : String(v);
  }
  return out;
}

