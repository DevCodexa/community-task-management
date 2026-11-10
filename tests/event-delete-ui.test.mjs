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

function loadPage(service) {
  const source = readFileSync(new URL('../src/pages/EventsPage.tsx', import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const exports = {};
  const dependencies = {
    react: React,
    'react/jsx-runtime': require('react/jsx-runtime'),
    'lucide-react': new Proxy({}, { get: () => empty }),
    '../components/events': {
      EventTable: ({ onDelete }) => React.createElement('button', { onClick: () => onDelete('event-1') }, 'Etkinliği sil'),
      EventFormModal: empty,
    },
    '../types/event': { EVENT_TYPE_LABELS: { Workshop: 'Atölye' } },
    '../lib/supabaseEvents': service,
  };
  runInNewContext(compiled, {
    exports, console, Error,
    require: (name) => {
      if (name in dependencies) return dependencies[name];
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  return exports.EventsPage;
}

test('event deletion prevents repeated requests, shows failures, and refreshes after success', async () => {
  let rejectDelete;
  const pending = new Promise((_, reject) => { rejectDelete = reject; });
  let attempts = 0;
  let reads = 0;
  let rows = [{ id: 'event-1', event_type: 'Workshop' }];
  const service = {
    getEvents: async () => { reads += 1; return { data: rows }; },
    getEventStaff: async () => [],
    deleteEvent: async () => {
      attempts += 1;
      if (attempts === 1) return pending;
      rows = [];
    },
  };
  const Page = loadPage(service);
  let view;
  await act(async () => { view = create(React.createElement(Page)); });
  const findButton = (text) => view.root.findAllByType('button').find((button) => button.children.includes(text));
  await act(async () => { findButton('Etkinliği sil').props.onClick(); });
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
  assert.equal(reads, 1);
  assert.ok(findButton('Etkinliği sil'));
  await act(async () => { findButton('Sil').props.onClick(); });
  assert.equal(attempts, 2);
  assert.equal(reads, 2);
  assert.equal(findButton('Etkinliği sil'), undefined);
  assert.equal(view.root.findAllByProps({ role: 'alert' }).length, 0);
  await act(async () => { view.unmount(); });
});
