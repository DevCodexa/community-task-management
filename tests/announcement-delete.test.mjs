import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import React from 'react';
import { act, create } from 'react-test-renderer';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const empty = () => null;
function load(path, dependencies) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  const exports = {};
  runInNewContext(js, { exports, Error, console: { log() {}, error() {} }, setTimeout, clearTimeout,
    require: (name) => { if (name in dependencies) return dependencies[name]; throw new Error(`Unexpected import: ${name}`); } });
  return exports;
}

test('deleteAnnouncement checks the affected row and reports missing or denied records', async () => {
  let response; const calls = [];
  const supabase = { from(table) {
    const call = { table }; calls.push(call);
    const q = { delete() { call.action = 'delete'; return q; }, eq(k, v) { call.filter = [k, v]; return q; },
      select(k) { call.select = k; return q; }, maybeSingle() { return Promise.resolve(response); } };
    return q;
  } };
  const { deleteAnnouncement } = load('../src/lib/supabaseAnnouncements.ts', { './supabase': { supabase }, '../types/event': { EVENT_TYPE_VALUES: [] } });
  response = { data: { id: 'announcement-1' }, error: null };
  await deleteAnnouncement('announcement-1');
  assert.deepEqual(calls[0], { table: 'announcements', action: 'delete', filter: ['id', 'announcement-1'], select: 'id' });
  response = { data: null, error: null };
  await assert.rejects(deleteAnnouncement('announcement-1'), /silinemedi veya bulunamadı/);
  response = { data: null, error: { message: 'permission denied' } };
  await assert.rejects(deleteAnnouncement('announcement-1'), /permission denied/);
});

test('announcement delete blocks repeat clicks, displays safe errors and allows retry', async () => {
  let rejectDelete; let attempts = 0;
  const pending = new Promise((_, reject) => { rejectDelete = reject; });
  const announcement = { id: 'announcement-1', title: 'Example', type: 'Other', description: '' };
  const service = { getAnnouncements: async () => ({ data: [announcement], totalPages: 1 }),
    deleteAnnouncement: () => { attempts++; return attempts === 1 ? pending : Promise.resolve(); } };
  const { AnnouncementsPage } = load('../src/pages/AnnouncementsPage.tsx', {
    react: React, 'react/jsx-runtime': require('react/jsx-runtime'),
    'lucide-react': new Proxy({}, { get: () => empty }),
    '../types/event': { EVENT_TYPE_VALUES: [], EVENT_TYPE_LABELS: {} },
    '../lib/supabaseAnnouncements': service,
    '../components/announcements/AnnouncementFormModal': { AnnouncementFormModal: empty },
    '../components/announcements/AnnouncementDetailsModal': { AnnouncementDetailsModal: empty },
    '../components/announcements/AnnouncementTable': { AnnouncementTable: empty },
    '../components/announcements/AnnouncementCard': { AnnouncementCard: ({ onDelete }) => React.createElement('button', { onClick: () => onDelete(announcement.id) }, 'Duyuruyu seç') },
  });
  let view;
  await act(async () => { view = create(React.createElement(AnnouncementsPage)); });
  const button = (text) => view.root.findAllByType('button').find((item) => item.children.includes(text));
  await act(async () => { button('Duyuruyu seç').props.onClick(); });
  await act(async () => { const confirm = button('Sil'); confirm.props.onClick(); confirm.props.onClick(); });
  assert.equal(attempts, 1);
  assert.equal(button('Siliniyor…').props.disabled, true);
  await act(async () => { rejectDelete(new Error('private database details')); });
  assert.match(view.root.findByProps({ role: 'alert' }).children.join(''), /Duyuru silinemedi/);
  assert.doesNotMatch(view.root.findByProps({ role: 'alert' }).children.join(''), /private/);
  await act(async () => { await button('Sil').props.onClick(); });
  assert.equal(attempts, 2);
  assert.equal(view.root.findByProps({ role: 'status' }).children.join(''), 'Duyuru silindi.');
  await act(async () => { view.unmount(); });
});
