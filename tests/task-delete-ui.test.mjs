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

function loadPage(deleteTask) {
  const source = readFileSync(new URL('../src/pages/TasksPage.tsx', import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const exports = {};
  const dependencies = {
    'react': React,
    'react/jsx-runtime': require('react/jsx-runtime'),
    'lucide-react': new Proxy({}, { get: () => empty }),
    '../components/tasks/TaskTable': { TaskTable: ({ onDelete }) => React.createElement('button', { onClick: () => onDelete('task-1') }, 'Tablodan sil') },
    '../components/tasks/TaskFormModal': { TaskFormModal: empty },
    '../components/tasks/TaskDetailsModal': { TaskDetailsModal: empty },
    '../components/kanban/KanbanBoard': { KanbanBoard: empty },
    '../components/tasks/ArchivedTaskTable': { ArchivedTaskTable: empty },
    '../lib/supabaseTasks': { getTasks: async () => ({ data: [] }), deleteTask },
    '../lib/supabaseTasksArchive': { getArchivedTasks: async () => ({ data: [], total: 0 }) },
    '../lib/supabaseTasksRestore': { restoreArchivedTaskToDone: async () => {} },
  };
  runInNewContext(compiled, {
    exports, console, Error,
    require: (name) => {
      if (name in dependencies) return dependencies[name];
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  return exports.TasksPage;
}

test('table deletion requires confirmation, prevents repeats, and shows failures', async () => {
  let rejectDelete;
  let attempts = 0;
  const pending = new Promise((_, reject) => { rejectDelete = reject; });
  const Page = loadPage(() => { attempts += 1; return pending; });
  let view;
  await act(async () => { view = create(React.createElement(Page)); });
  const buttons = () => view.root.findAllByType('button');
  const findButton = (text) => buttons().find((button) =>
    button.children.includes(text) || button.findAllByType('span').some((span) => span.children.includes(text)));
  await act(async () => { findButton('Tablo').props.onClick(); });
  await act(async () => { findButton('Tablodan sil').props.onClick(); });
  assert.equal(attempts, 0);
  await act(async () => {
    const confirm = findButton('Sil');
    confirm.props.onClick();
    confirm.props.onClick();
  });
  assert.equal(attempts, 1);
  assert.equal(findButton('Siliniyor…').props.disabled, true);
  await act(async () => { rejectDelete(new Error('Yetki yok')); });
  assert.equal(view.root.findByProps({ role: 'alert' }).children.join(''), 'Yetki yok');
  assert.ok(findButton('Sil'));
  await act(async () => { view.unmount(); });
});
