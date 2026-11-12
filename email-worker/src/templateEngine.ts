import { parseFragment, type DefaultTreeAdapterTypes } from 'parse5';

const placeholder = /\{\{\s*([^}]+?)\s*\}\}/g;
const rawTextElements = new Set(['script', 'style', 'textarea', 'title', 'xmp', 'iframe', 'noembed', 'noframes', 'plaintext', 'noscript']);

function valueFor(params: Record<string, string>, key: string): string {
  const name = key.trim();
  return Object.prototype.hasOwnProperty.call(params, name) ? params[name] : '';
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]!);
}

// Only HTML text nodes are supported. Attribute/URL, CSS, script, comments and
// foreign-content contexts need different rules, so they fail closed.
export function renderTemplate(html: string, params: Record<string, string>): string {
  const textRanges: Array<{ start: number; end: number }> = [];
  const root = parseFragment(html, { sourceCodeLocationInfo: true });

  function visit(node: DefaultTreeAdapterTypes.Node, safe: boolean): void {
    if ('tagName' in node) {
      safe = safe && node.namespaceURI === 'http://www.w3.org/1999/xhtml' && !rawTextElements.has(node.tagName);
    }
    if (node.nodeName === '#text' && safe && node.sourceCodeLocation) {
      textRanges.push({ start: node.sourceCodeLocation.startOffset, end: node.sourceCodeLocation.endOffset });
    }
    if ('childNodes' in node) node.childNodes.forEach((child) => visit(child, safe));
    // A template element's content is a separate document fragment; its
    // placeholders are intentionally not supported.
  }
  visit(root, true);

  return html.replace(placeholder, (match: string, key: string, offset: number) => {
    if (!textRanges.some((range) => offset >= range.start && offset + match.length <= range.end)) {
      throw new Error('Email template placeholders are only supported in HTML text');
    }
    return escapeHtml(valueFor(params, key));
  });
}

// Subjects are plain text, not HTML: HTML escaping would show literal entities.
export function renderSubject(subject: string, params: Record<string, string>): string {
  return subject.replace(placeholder, (_match: string, key: string) => valueFor(params, key));
}

// Validate both local subject and HTML placeholders before claiming or sending.
// Only names are returned; parameter values can contain personal data.
export function missingTemplateParams(source: string, params: Record<string, string>): string[] {
  const names = new Set<string>();
  for (const match of source.matchAll(placeholder)) {
    const name = match[1].trim();
    if (!params[name]?.trim()) names.add(name);
  }
  return [...names];
}

export function normalizeTemplateParams(params: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(params ?? {})) {
    out[k] = v == null ? '' : typeof v === 'string' ? v : String(v);
  }
  return out;
}
