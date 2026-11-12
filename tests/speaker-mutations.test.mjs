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
function load(path, modules) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  const exports = {};
  runInNewContext(code, { exports, Error, Date, console: { error() {}, log() {} }, require(name) {
    if (name in modules) return modules[name]; throw new Error(`Unexpected import: ${name}`);
  } });
  return exports;
}

test('speaker delete requires a returned row and surfaces denied requests', async () => {
  let response; const calls = [];
  const supabase = { from(table) {
    const call = { table }; calls.push(call);
    const q = { delete() { call.action = 'delete'; return q; }, eq(k, v) { call.filter = [k, v]; return q; },
      select(v) { call.select = v; return q; }, maybeSingle() { return Promise.resolve(response); } }; return q;
  } };
  const { deleteSpeaker } = load('../src/lib/supabaseSpeakers.ts', { './supabase': { supabase } });
  response = { data: { id: 'speaker-1' }, error: null }; await deleteSpeaker('speaker-1');
  assert.deepEqual(calls[0], { table: 'speakers', action: 'delete', filter: ['id', 'speaker-1'], select: 'id' });
  response = { data: null, error: null }; await assert.rejects(deleteSpeaker('speaker-1'), /silinemedi veya bulunamadı/);
  response = { data: null, error: { message: 'permission denied' } }; await assert.rejects(deleteSpeaker('speaker-1'), /permission denied/);
});

test('speaker deletion warns about related records, prevents duplicates and allows retry', async () => {
  let rejectDelete; let attempts = 0;
  const pending = new Promise((_, reject) => { rejectDelete = reject; });
  const speaker = { id: 'speaker-1', full_name: 'Ada', status: 'neutral' };
  const service = { getSpeakers: async () => ({ data: [speaker] }), deleteSpeaker: () => { attempts++; return attempts === 1 ? pending : Promise.resolve(); } };
  const { SpeakersPage } = load('../src/pages/SpeakersPage.tsx', {
    react: React, 'react/jsx-runtime': require('react/jsx-runtime'), 'lucide-react': new Proxy({}, { get: () => empty }),
    '../lib/supabaseSpeakers': service,
    '../components/speakers/SpeakerTable': { SpeakerTable: ({ onDelete }) => React.createElement('button', { onClick: () => onDelete(speaker.id) }, 'Konuşmacıyı seç') },
    '../components/speakers/SpeakerModal': { SpeakerModal: empty }, '../components/speakers/SpeakerDetailModal': { SpeakerDetailModal: empty },
  });
  let view; await act(async () => { view = create(React.createElement(SpeakersPage)); });
  const button = (text) => view.root.findAllByType('button').find((x) => x.children.includes(text));
  await act(async () => { button('Konuşmacıyı seç').props.onClick(); });
  assert.ok(view.root.findAllByType('p').some((p) => p.children.some((v) => typeof v === 'string' && v.includes('e-posta kuyruk kayıtları'))));
  await act(async () => { const confirm = button('Evet, Sil'); confirm.props.onClick(); confirm.props.onClick(); });
  assert.equal(attempts, 1); assert.equal(button('Siliniyor…').props.disabled, true);
  await act(async () => { rejectDelete(new Error('private database error')); });
  assert.match(view.root.findByProps({ role: 'alert' }).children.join(''), /Konuşmacı silinemedi/);
  await act(async () => { await button('Evet, Sil').props.onClick(); });
  assert.equal(attempts, 2); assert.equal(view.root.findByProps({ role: 'status' }).children.join(''), 'Konuşmacı silindi.');
  await act(async () => { view.unmount(); });
});

test('speaker form validates and prevents duplicate saves while showing safe failures', async () => {
  let rejectSave; let attempts = 0; let valid = false;
  const pending = new Promise((_, reject) => { rejectSave = reject; });
  const service = { validateSpeakerData: () => valid ? { valid: true, errors: [] } : { valid: false, errors: ['Ad Soyad zorunludur'] },
    createSpeaker: () => { attempts++; return pending; }, updateSpeaker: async () => {} };
  const { SpeakerModal } = load('../src/components/speakers/SpeakerModal.tsx', { react: React,
    'react/jsx-runtime': require('react/jsx-runtime'), 'lucide-react': new Proxy({}, { get: () => empty }), '../../lib/supabaseSpeakers': service });
  let closes = 0; let successes = 0; let view;
  await act(async () => { view = create(React.createElement(SpeakerModal, { isOpen: true, onClose: () => closes++, onSuccess: () => successes++ })); });
  const form = view.root.findByType('form');
  await act(async () => { form.props.onSubmit({ preventDefault() {} }); });
  assert.match(view.root.findByProps({ role: 'alert' }).children.join(''), /Ad Soyad zorunludur/); assert.equal(attempts, 0);
  valid = true;
  await act(async () => { form.props.onSubmit({ preventDefault() {} }); form.props.onSubmit({ preventDefault() {} }); });
  assert.equal(attempts, 1); assert.equal(view.root.findByProps({ type: 'submit' }).props.disabled, true);
  await act(async () => { rejectSave(new Error('private database error')); });
  assert.match(view.root.findByProps({ role: 'alert' }).children.join(''), /Konuşmacı kaydedilemedi/);
  assert.equal(closes, 0); assert.equal(successes, 0);
  await act(async () => { view.unmount(); });
});
