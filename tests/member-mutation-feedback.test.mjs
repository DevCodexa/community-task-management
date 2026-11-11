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
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  const exports = {};
  runInNewContext(compiled, { exports, console: { error() {}, log() {} }, Error, Date,
    require: (name) => {
      if (name in dependencies) return dependencies[name];
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  return exports;
}

test('member delete requires an actual returned row and surfaces database failure', async () => {
  let response;
  const calls = [];
  const supabase = { from(table) {
    const call = { table }; calls.push(call);
    const query = {
      delete() { call.operation = 'delete'; return query; },
      eq(field, value) { call.filter = [field, value]; return query; },
      select(field) { call.select = field; return query; },
      maybeSingle() { return Promise.resolve(response); },
    };
    return query;
  } };
  const { deleteMember } = load('../src/lib/supabaseMembers.ts', { './supabase': { supabase }, '../types/member': {} });
  response = { data: { id: 'member-1' }, error: null };
  await deleteMember('member-1');
  assert.equal(JSON.stringify(calls[0]), JSON.stringify({ table: 'members', operation: 'delete', filter: ['id', 'member-1'], select: 'id' }));
  response = { data: null, error: null };
  await assert.rejects(deleteMember('member-1'), /silinemedi veya bulunamadı/);
  response = { data: null, error: { message: 'permission denied' } };
  await assert.rejects(deleteMember('member-1'), /permission denied/);
});

test('member deletion prevents duplicate clicks, retains dialog on failure, and allows retry', async () => {
  let attempts = 0;
  let rejectDelete;
  const pending = new Promise((_, reject) => { rejectDelete = reject; });
  const member = { id: 'member-1', name: 'Member', email: 'a@example.test', company: '', comm_title: '' };
  const dependencies = {
    react: React, 'react/jsx-runtime': require('react/jsx-runtime'),
    'lucide-react': new Proxy({}, { get: () => empty }),
    './MemberTable': { MemberTable: ({ onDelete }) => React.createElement('button', { onClick: () => onDelete(member.id) }, 'Üyeyi seç') },
    './MemberModal': { MemberModal: empty }, './DetailModal': { DetailModal: empty },
    '../../lib/supabaseMembers': { getMembers: async () => ({ data: [member] }), deleteMember: () => { attempts++; return attempts === 1 ? pending : Promise.resolve(); } },
  };
  const { MembersPage } = load('../src/components/members/MembersPage.tsx', dependencies);
  let view;
  await act(async () => { view = create(React.createElement(MembersPage)); });
  const button = (text) => view.root.findAllByType('button').find((item) => item.children.includes(text));
  await act(async () => { button('Üyeyi seç').props.onClick(); });
  await act(async () => { const confirm = button('Evet, Sil'); confirm.props.onClick(); confirm.props.onClick(); });
  assert.equal(attempts, 1);
  assert.equal(button('Siliniyor…').props.disabled, true);
  await act(async () => { rejectDelete(new Error('private database details')); });
  assert.match(view.root.findByProps({ role: 'alert' }).children.join(''), /Üye silinemedi/);
  assert.doesNotMatch(view.root.findByProps({ role: 'alert' }).children.join(''), /private/);
  await act(async () => { await button('Evet, Sil').props.onClick(); });
  assert.equal(attempts, 2);
  assert.match(view.root.findByProps({ role: 'status' }).children.join(''), /Üye silindi/);
  await act(async () => { view.unmount(); });
});

test('member form blocks simultaneous submits and retains a safe error on failure', async () => {
  let attempts = 0; let rejectSave;
  const pending = new Promise((_, reject) => { rejectSave = reject; });
  const dependencies = {
    react: React, 'react/jsx-runtime': require('react/jsx-runtime'),
    'lucide-react': new Proxy({}, { get: () => empty }),
    '../../lib/supabaseMembers': { createMember: () => { attempts++; return pending; }, updateMember: async () => {} },
    './MemberFormFields': { MemberFormFields: empty }, '../../context/ThemeContext': { useTheme: () => ({ isIceBlue: false }) },
  };
  const { MemberModal } = load('../src/components/members/MemberModal.tsx', dependencies);
  let closes = 0; let view;
  await act(async () => { view = create(React.createElement(MemberModal, { isOpen: true, onClose: () => closes++, onSuccess: () => {} })); });
  const form = view.root.findByType('form');
  await act(async () => { form.props.onSubmit({ preventDefault() {} }); form.props.onSubmit({ preventDefault() {} }); });
  assert.equal(attempts, 1);
  assert.equal(view.root.findByProps({ type: 'submit' }).props.disabled, true);
  await act(async () => { rejectSave(new Error('private database details')); });
  assert.match(view.root.findByProps({ role: 'alert' }).children.join(''), /Üye kaydedilemedi/);
  assert.doesNotMatch(view.root.findByProps({ role: 'alert' }).children.join(''), /private/);
  assert.equal(closes, 0);
  await act(async () => { view.unmount(); });
});

test('member form reports success only after the save resolves', async () => {
  let resolveSave;
  const pending = new Promise((resolve) => { resolveSave = resolve; });
  const dependencies = {
    react: React, 'react/jsx-runtime': require('react/jsx-runtime'),
    'lucide-react': new Proxy({}, { get: () => empty }),
    '../../lib/supabaseMembers': { createMember: () => pending, updateMember: async () => {} },
    './MemberFormFields': { MemberFormFields: empty }, '../../context/ThemeContext': { useTheme: () => ({ isIceBlue: false }) },
  };
  const { MemberModal } = load('../src/components/members/MemberModal.tsx', dependencies);
  let successes = 0; let closes = 0; let view;
  await act(async () => { view = create(React.createElement(MemberModal, { isOpen: true, onClose: () => closes++, onSuccess: () => successes++ })); });
  await act(async () => { view.root.findByType('form').props.onSubmit({ preventDefault() {} }); });
  assert.equal(successes, 0); assert.equal(closes, 0);
  await act(async () => { resolveSave({ id: 'member-1' }); });
  assert.equal(successes, 1); assert.equal(closes, 1);
  await act(async () => { view.unmount(); });
});
