import React from 'react';
import test from 'node:test';
import assert from 'node:assert/strict';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { NotificationCenter, type NotificationCenterService } from '../src/pages/NotificationCenter';
import { publishNotificationChange, subscribeNotificationChanges } from '../src/lib/notificationChanges';
import { useNotificationsCore, type NotificationFeedService } from '../src/hooks/useNotificationsCore';
import type { FullNotification, NotificationQueryParams, PaginatedNotificationsResponse } from '../src/types/notification';

function notification(id: string): FullNotification {
  return { id, user_id: 'member-a', title: id, message: id, type: 'birthday', is_read: false,
    related_id: null, related_type: null, actor_id: null, actor_name: null,
    created_at: '2026-11-01T12:00:00Z', read_at: null };
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}
function response(data: FullNotification[], page = 1, total = data.length): PaginatedNotificationsResponse {
  return { data, page, total, limit: 20, totalPages: Math.ceil(total / 20), hasNext: page * 20 < total, hasPrev: page > 1 };
}
function serviceFor(rows: FullNotification[]) {
  const service: NotificationCenterService = {
    getNotifications: async (params: NotificationQueryParams) => {
      assert.equal(params.user_id, 'member-a');
      const filtered = rows.filter((row) => params.is_read === undefined || row.is_read === params.is_read);
      const page = params.page ?? 1;
      return response(filtered.slice((page - 1) * 20, page * 20), page, filtered.length);
    },
    deleteNotification: async (id) => { const index = rows.findIndex((row) => row.id === id); if (index >= 0) rows.splice(index, 1); },
    markAsRead: async (id) => { const row = rows.find((item) => item.id === id)!; row.is_read = true; return row; },
    markAllAsRead: async () => { rows.forEach((row) => { row.is_read = true; }); return rows.length; },
    clearAllNotifications: async () => { rows.splice(0); return 0; },
  };
  return service;
}
async function render(service: NotificationCenterService) {
  let view!: ReactTestRenderer;
  await act(async () => { view = create(<NotificationCenter userId="member-a" service={service} confirmClear={() => true} />); });
  return view;
}
function textOf(view: ReactTestRenderer) { return JSON.stringify(view.toJSON()); }

test('shows the empty state for an empty notification list', async () => {
  const view = await render(serviceFor([]));
  assert.match(textOf(view), /Bu filtrede bildirim yok/);
  view.unmount();
});

test('an older request cannot replace results for a newer filter', async () => {
  const first = deferred<PaginatedNotificationsResponse>();
  const second = deferred<PaginatedNotificationsResponse>();
  const service = serviceFor([]);
  service.getNotifications = async (params) => params.is_read === false ? second.promise : first.promise;
  let view!: ReactTestRenderer;
  await act(async () => { view = create(<NotificationCenter userId="member-a" service={service} confirmClear={() => true} />); });
  const statusSelect = view.root.findAllByType('select')[1];
  await act(async () => { statusSelect.props.onChange({ target: { value: 'unread' } }); });
  await act(async () => { second.resolve(response([notification('new-filter')])); await second.promise; });
  await act(async () => { first.resolve(response([notification('old-filter')])); await first.promise; });
  assert.match(textOf(view), /new-filter/);
  assert.doesNotMatch(textOf(view), /old-filter/);
  view.unmount();
});

test('deleting the last item on a page returns to the previous page and notifies the bell', async () => {
  const rows = Array.from({ length: 21 }, (_, index) => notification(`item-${index + 1}`));
  const events: unknown[] = [];
  const unsubscribe = subscribeNotificationChanges((event) => events.push(event));
  const view = await render(serviceFor(rows));
  await act(async () => { view.root.findByProps({ 'aria-label': 'Sonraki sayfa' }).props.onClick(); });
  assert.match(textOf(view), /item-21/);
  await act(async () => { view.root.findByProps({ 'aria-label': 'Bildirimi sil' }).props.onClick(); });
  assert.match(textOf(view), /item-1/);
  assert.equal(view.root.findByProps({ 'aria-label': 'Önceki sayfa' }).props.disabled, true);
  assert.equal(view.root.findByProps({ 'aria-label': 'Sonraki sayfa' }).props.disabled, true);
  assert.doesNotMatch(textOf(view), /item-21/);
  assert.deepEqual(events, [{ userId: 'member-a', type: 'delete', id: 'item-21' }]);
  unsubscribe(); view.unmount();
});

test('marking a notification read updates the unread filter and emits a recipient-scoped change', async () => {
  const events: unknown[] = [];
  const unsubscribe = subscribeNotificationChanges((event) => events.push(event));
  const view = await render(serviceFor([notification('hello')]));
  await act(async () => { view.root.findAllByType('select')[1].props.onChange({ target: { value: 'unread' } }); });
  const button = view.root.findByType('li').findAllByType('button')[0];
  await act(async () => { button.props.onClick(); });
  assert.match(textOf(view), /Bu filtrede bildirim yok/);
  assert.deepEqual(events, [{ userId: 'member-a', type: 'read', id: 'hello' }]);
  unsubscribe(); view.unmount();
});

test('failed delete keeps the notification and does not emit a success event', async () => {
  const events: unknown[] = [];
  const unsubscribe = subscribeNotificationChanges((event) => events.push(event));
  const service = serviceFor([notification('keep-me')]);
  service.deleteNotification = async () => { throw new Error('Silme başarısız'); };
  const view = await render(service);
  await act(async () => { view.root.findByProps({ 'aria-label': 'Bildirimi sil' }).props.onClick(); });
  assert.match(textOf(view), /keep-me/);
  assert.match(textOf(view), /Silme başarısız/);
  assert.deepEqual(events, []);
  unsubscribe(); view.unmount();
});

test('marking a notification read on the page updates the actual bell hook', async () => {
  const rows = [notification('bell-test')];
  const pageService = serviceFor(rows);
  const feedService: NotificationFeedService = {
    ...pageService,
    getUnreadCount: async () => rows.filter((row) => !row.is_read).length,
    subscribeToNotifications: () => () => {},
  };
  function Bell() {
    const { unreadCount } = useNotificationsCore({ user_id: 'member-a' }, feedService);
    return <output data-testid="bell">{unreadCount}</output>;
  }
  let view!: ReactTestRenderer;
  await act(async () => { view = create(<><Bell /><NotificationCenter userId="member-a" service={pageService} confirmClear={() => true} /></>); });
  assert.deepEqual(view.root.findByProps({ 'data-testid': 'bell' }).children, ['1']);
  await act(async () => { publishNotificationChange({ userId: 'member-b', type: 'clear-all' }); });
  assert.deepEqual(view.root.findByProps({ 'data-testid': 'bell' }).children, ['1']);
  await act(async () => { view.root.findByType('li').findAllByType('button')[0].props.onClick(); });
  assert.deepEqual(view.root.findByProps({ 'data-testid': 'bell' }).children, ['0']);
  view.unmount();
});

test('the actual bell hook deduplicates a realtime insert overlapping its initial fetch', async () => {
  const initial = deferred<PaginatedNotificationsResponse>();
  const entry = notification('realtime-overlap');
  let realtime!: (row: FullNotification) => void;
  const feedService: NotificationFeedService = {
    ...serviceFor([]),
    getNotifications: () => initial.promise,
    getUnreadCount: async () => 1,
    subscribeToNotifications: (callback) => { realtime = callback; return () => {}; },
  };
  function Bell() {
    const { notifications } = useNotificationsCore({ user_id: 'member-a' }, feedService);
    return <output data-testid="feed">{notifications.map((item) => item.id).join(',')}</output>;
  }
  let view!: ReactTestRenderer;
  await act(async () => { view = create(<Bell />); });
  await act(async () => { realtime(entry); });
  await act(async () => { initial.resolve(response([entry])); await initial.promise; });
  assert.deepEqual(view.root.findByProps({ 'data-testid': 'feed' }).children, ['realtime-overlap']);
  view.unmount();
});

for (const operation of ['read', 'delete'] as const) {
  test(`a delayed bell ${operation} response does not double-count a page deletion`, async () => {
    const rows = [notification('a'), notification('b'), notification('c')];
    const pending = deferred<void>();
    const pageService = serviceFor(rows);
    const feedService: NotificationFeedService = {
      ...pageService,
      getNotifications: async (params) => {
        const result = await pageService.getNotifications(params);
        return { ...result, data: result.data.map((row) => ({ ...row })) };
      },
      getUnreadCount: async () => rows.filter((row) => !row.is_read).length,
      markAsRead: async (id) => {
        const row = rows.find((item) => item.id === id)!;
        row.is_read = true;
        await pending.promise;
        return row;
      },
      deleteNotification: async (id) => {
        rows.splice(rows.findIndex((row) => row.id === id), 1);
        await pending.promise;
      },
      subscribeToNotifications: () => () => {},
    };
    function Bell() {
      const bell = useNotificationsCore({ user_id: 'member-a' }, feedService);
      return <><output data-testid="count">{bell.unreadCount}</output>
        <button data-testid="bell-action" onClick={() => void (operation === 'read' ? bell.markAsRead('a') : bell.removeNotification('a'))}>Bell action</button></>;
    }
    let view!: ReactTestRenderer;
    await act(async () => { view = create(<><Bell /><NotificationCenter userId="member-a" service={pageService} confirmClear={() => true} /></>); });
    await act(async () => { view.root.findByProps({ 'data-testid': 'bell-action' }).props.onClick(); });
    const secondRow = view.root.findAllByType('li').find((row) => row.findAllByType('span').some((span) => span.children.includes('b')))!;
    await act(async () => { secondRow.findByProps({ 'aria-label': 'Bildirimi sil' }).props.onClick(); });
    assert.deepEqual(view.root.findByProps({ 'data-testid': 'count' }).children, ['1']);
    await act(async () => { pending.resolve(); await pending.promise; });
    assert.deepEqual(view.root.findByProps({ 'data-testid': 'count' }).children, ['1']);
    await act(async () => { view.unmount(); });
  });
}

for (const operation of ['read', 'delete', 'read-all'] as const) {
  test(`the center refreshes after a successful bell ${operation}`, async () => {
    const rows = [notification('alpha')];
    const pageService = serviceFor(rows);
    const feedService: NotificationFeedService = {
      ...pageService,
      getUnreadCount: async () => rows.filter((row) => !row.is_read).length,
      subscribeToNotifications: () => () => {},
    };
    function Bell() {
      const bell = useNotificationsCore({ user_id: 'member-a' }, feedService);
      const action = () => operation === 'read' ? bell.markAsRead('alpha')
        : operation === 'delete' ? bell.removeNotification('alpha') : bell.markAllAsRead();
      return <button data-testid="bell-action" onClick={() => void action()}>Bell action</button>;
    }
    let view!: ReactTestRenderer;
    await act(async () => { view = create(<><Bell /><NotificationCenter userId="member-a" service={pageService} confirmClear={() => true} /></>); });
    await act(async () => { view.root.findAllByType('select')[1].props.onChange({ target: { value: 'unread' } }); });
    assert.match(textOf(view), /alpha/);
    await act(async () => { view.root.findByProps({ 'data-testid': 'bell-action' }).props.onClick(); });
    assert.match(textOf(view), /Bu filtrede bildirim yok/);
    assert.doesNotMatch(textOf(view), /"alpha"/);
    await act(async () => { view.unmount(); });
  });
}

test('a realtime insert refreshes the center only for the active recipient', async () => {
  const rows = [notification('alpha')];
  const pageService = serviceFor(rows);
  let realtime!: (row: FullNotification) => void;
  let requests = 0;
  const originalGet = pageService.getNotifications;
  pageService.getNotifications = async (params) => { requests += 1; return originalGet(params); };
  const feedService: NotificationFeedService = {
    ...pageService,
    getUnreadCount: async () => rows.filter((row) => !row.is_read).length,
    subscribeToNotifications: (callback) => { realtime = callback; return () => {}; },
  };
  function Bell() { useNotificationsCore({ user_id: 'member-a' }, feedService); return null; }
  let view!: ReactTestRenderer;
  await act(async () => { view = create(<><Bell /><NotificationCenter userId="member-a" service={pageService} confirmClear={() => true} /></>); });
  const initialRequests = requests;
  await act(async () => { realtime({ ...notification('foreign'), user_id: 'member-b' }); });
  assert.equal(requests, initialRequests);
  rows.unshift(notification('new'));
  await act(async () => { realtime(rows[0]); });
  assert.match(textOf(view), /new/);
  assert.equal(requests, initialRequests + 1);
  await act(async () => { realtime(rows[0]); });
  assert.equal(requests, initialRequests + 1);
  await act(async () => { view.unmount(); });
});

test('a realtime event refreshes the page even if the bell already fetched that row', async () => {
  const entry = notification('already-in-bell');
  let pageRequests = 0;
  const pageService = serviceFor([entry]);
  pageService.getNotifications = async () => {
    pageRequests += 1;
    return response(pageRequests === 1 ? [] : [entry]);
  };
  let realtime!: (row: FullNotification) => void;
  const feedService: NotificationFeedService = {
    ...pageService,
    getNotifications: async () => response([entry]),
    getUnreadCount: async () => 1,
    subscribeToNotifications: (callback) => { realtime = callback; return () => {}; },
  };
  function Bell() {
    const { notifications } = useNotificationsCore({ user_id: 'member-a' }, feedService);
    return <output data-testid="bell-feed">{notifications.map((row) => row.id).join(',')}</output>;
  }
  let view!: ReactTestRenderer;
  await act(async () => { view = create(<><Bell /><NotificationCenter userId="member-a" service={pageService} confirmClear={() => true} /></>); });
  assert.match(textOf(view), /Bu filtrede bildirim yok/);
  await act(async () => { realtime(entry); realtime(entry); });
  assert.equal(pageRequests, 2);
  assert.equal(view.root.findAllByType('li').length, 1);
  assert.deepEqual(view.root.findByProps({ 'data-testid': 'bell-feed' }).children, ['already-in-bell']);
  await act(async () => { view.unmount(); });
});

test('a notification received during mark-all remains unread in the bell', async () => {
  const rows = [notification('alpha')];
  const pageService = serviceFor(rows);
  const pending = deferred<void>();
  let realtime!: (row: FullNotification) => void;
  const feedService: NotificationFeedService = {
    ...pageService,
    getNotifications: async (params) => {
      const result = await pageService.getNotifications(params);
      return { ...result, data: result.data.map((row) => ({ ...row })) };
    },
    getUnreadCount: async () => rows.filter((row) => !row.is_read).length,
    markAllAsRead: async () => { rows.forEach((row) => { row.is_read = true; }); await pending.promise; return 1; },
    subscribeToNotifications: (callback) => { realtime = callback; return () => {}; },
  };
  function Bell() {
    const bell = useNotificationsCore({ user_id: 'member-a' }, feedService);
    return <><button data-testid="all" onClick={() => void bell.markAllAsRead()}>All</button>
      <output data-testid="state">{bell.notifications.map((row) => `${row.id}:${row.is_read}`).join(',')}</output></>;
  }
  let view!: ReactTestRenderer;
  await act(async () => { view = create(<Bell />); });
  await act(async () => { view.root.findByProps({ 'data-testid': 'all' }).props.onClick(); });
  const fresh = { ...notification('new'), created_at: '2026-11-01T12:01:00Z' };
  rows.unshift(fresh);
  await act(async () => { realtime(fresh); });
  await act(async () => { pending.resolve(); await pending.promise; });
  assert.deepEqual(view.root.findByProps({ 'data-testid': 'state' }).children, ['new:false,alpha:true']);
  await act(async () => { view.unmount(); });
});

test('a delayed mark-all response cannot reload the previous recipient after a user switch', async () => {
  const pending = deferred<void>();
  const calls: string[] = [];
  const feedService: NotificationFeedService = {
    ...serviceFor([]),
    getNotifications: async ({ user_id }) => {
      calls.push(user_id!);
      return response([{ ...notification(user_id!), user_id: user_id! }]);
    },
    getUnreadCount: async () => 1,
    markAllAsRead: async () => { await pending.promise; return 1; },
    subscribeToNotifications: () => () => {},
  };
  function Bell({ userId }: { userId: string }) {
    const bell = useNotificationsCore({ user_id: userId }, feedService);
    return <><button data-testid="all" onClick={() => void bell.markAllAsRead()}>All</button>
      <output data-testid="state">{bell.notifications.map((row) => row.id).join(',')}</output></>;
  }
  let view!: ReactTestRenderer;
  await act(async () => { view = create(<Bell userId="member-a" />); });
  await act(async () => { view.root.findByProps({ 'data-testid': 'all' }).props.onClick(); });
  await act(async () => { view.update(<Bell userId="member-b" />); });
  assert.deepEqual(view.root.findByProps({ 'data-testid': 'state' }).children, ['member-b']);
  await act(async () => { pending.resolve(); await pending.promise; });
  assert.deepEqual(view.root.findByProps({ 'data-testid': 'state' }).children, ['member-b']);
  assert.deepEqual(calls, ['member-a', 'member-b']);
  await act(async () => { view.unmount(); });
});
