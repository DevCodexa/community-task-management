import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import React from 'react';
import { act, create } from 'react-test-renderer';
import ts from 'typescript';

const require = createRequire(import.meta.url);

function loadComponents(state, rpc) {
  const source = readFileSync(new URL('../src/pages/ProfilePage.tsx', import.meta.url), 'utf8');
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const exports = {};
  const dependencies = {
    react: React,
    'react/jsx-runtime': require('react/jsx-runtime'),
    '../lib/supabase': { supabase: { rpc } },
    '../context/UserProfileContext': { useUserProfile: () => state.current },
  };
  runInNewContext(code, {
    exports, console,
    require: (name) => {
      if (name in dependencies) return dependencies[name];
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  return exports;
}

const auth = (id) => ({ user: { id: `auth-${id}` }, profile: { id }, isLoading: false });
const profile = (id, name) => ({ member: { id, name, email: `${id}@example.invalid` }, tasks: [], org_department_members: [] });
const text = (view) => JSON.stringify(view.toJSON());

test('the profile requests only the authenticated self-profile and rejects a mismatched response', async () => {
  const state = { current: auth('member-a') };
  const calls = [];
  const components = loadComponents(state, async (...args) => {
    calls.push(args);
    return { data: profile('member-b', 'Other member'), error: null };
  });
  let view;
  await act(async () => { view = create(React.createElement(components.default)); });
  assert.deepEqual(calls, [['get_my_profile']]);
  assert.match(text(view), /Profil yüklenemedi/);
  assert.doesNotMatch(text(view), /Other member/);
  await act(async () => { view.unmount(); });
});

test('a delayed response cannot show the previous member after an account switch', async () => {
  const state = { current: auth('member-a') };
  let resolveFirst;
  const pending = new Promise((resolve) => { resolveFirst = resolve; });
  let calls = 0;
  const components = loadComponents(state, async () => {
    calls += 1;
    return calls === 1 ? pending : { data: profile('member-b', 'Member B'), error: null };
  });
  let view;
  await act(async () => { view = create(React.createElement(components.default)); });
  state.current = auth('member-b');
  await act(async () => { view.update(React.createElement(components.default)); });
  assert.match(text(view), /Member B/);
  await act(async () => { resolveFirst({ data: profile('member-a', 'Member A'), error: null }); await pending; });
  assert.match(text(view), /Member B/);
  assert.doesNotMatch(text(view), /Member A/);
  await act(async () => { view.unmount(); });
});

test('signed-out users and retired token links do not request profile data', async () => {
  const state = { current: { user: null, profile: null, isLoading: false } };
  let calls = 0;
  const components = loadComponents(state, async () => { calls += 1; return { data: null, error: null }; });
  let view;
  await act(async () => { view = create(React.createElement(components.default)); });
  assert.match(text(view), /giriş yapmalısınız/);
  await act(async () => { view.update(React.createElement(components.LegacyProfileLink)); });
  assert.match(text(view), /eski profil bağlantısı/);
  assert.equal(calls, 0);
  await act(async () => { view.unmount(); });
});
