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
function loadPage(service, confirm) {
  const source = readFileSync(new URL('../src/pages/AreasPage.tsx', import.meta.url), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  const exports = {};
  const modules = {
    react: React, 'react/jsx-runtime': require('react/jsx-runtime'),
    'lucide-react': new Proxy({}, { get: () => empty }),
    'react-router-dom': { useNavigate: () => () => {}, useParams: () => ({ deptId: 'department-1' }) },
    '../lib/supabaseOrgHierarchy': service,
    '../components/org/AreaDetailModal': { AreaDetailModal: empty },
    '../components/org/AreaModal': { AreaModal: empty },
  };
  runInNewContext(code, { exports, Error, Map, console, window: { confirm }, require(name) {
    if (name in modules) return modules[name]; throw new Error(`Unexpected import: ${name}`);
  } });
  return exports.AreasPage;
}

test('area deletion explains cascading children, blocks duplicate requests and permits retry', async () => {
  let rejectDelete; let attempts = 0; const confirmations = [];
  const pending = new Promise((_, reject) => { rejectDelete = reject; });
  let areas = [{ id: 'area-1', name: 'Alan A', projects: [{ id: 'project-1' }], description: null }];
  const service = {
    getDepartments: async () => [{ id: 'department-1', name: 'Bölüm A' }],
    getAreasByDepartmentId: async () => areas,
    getAreaMembersByAreaId: async () => [],
    deleteArea: () => { attempts++; if (attempts === 1) return pending; areas = []; return Promise.resolve(); },
  };
  const Page = loadPage(service, (text) => { confirmations.push(text); return true; });
  let view;
  await act(async () => { view = create(React.createElement(Page)); });
  const find = (name) => view.root.findAllByType('button').find((x) => x.props['aria-label'] === name);
  await act(async () => { const button = find('Alanı sil'); button.props.onClick(); button.props.onClick(); });
  assert.equal(attempts, 1);
  assert.equal(confirmations.length, 1);
  assert.match(confirmations[0], /projeler ve üye atamaları da silinir/);
  assert.equal(find('Alan siliniyor').props.disabled, true);
  await act(async () => { rejectDelete(new Error('sensitive internal error')); });
  assert.ok(view.root.findByProps({ role: 'alert' }).findAllByType('p').some((p) => p.children.join('').includes('Alan silinemedi')));
  assert.ok(find('Alanı sil'));
  await act(async () => { await find('Alanı sil').props.onClick(); });
  assert.equal(attempts, 2);
  assert.equal(view.root.findByProps({ role: 'status' }).children.join(''), 'Alan silindi.');
  assert.equal(find('Alanı sil'), undefined);
  await act(async () => { view.unmount(); });
});

test('declining the confirmation never sends a deletion request', async () => {
  let attempts = 0;
  const service = { getDepartments: async () => [], getAreasByDepartmentId: async () => [{ id: 'area-1', name: 'Alan A' }],
    getAreaMembersByAreaId: async () => [], deleteArea: async () => { attempts++; } };
  const Page = loadPage(service, () => false); let view;
  await act(async () => { view = create(React.createElement(Page)); });
  await act(async () => { view.root.findByProps({ 'aria-label': 'Alanı sil' }).props.onClick(); });
  assert.equal(attempts, 0);
  await act(async () => { view.unmount(); });
});
