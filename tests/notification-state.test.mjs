import assert from 'node:assert/strict';
import test from 'node:test';
import {
  mergeNotificationFeed,
  shouldAcceptRealtimeNotification,
} from '../src/lib/notificationState.js';

function notification(id, user_id, created_at, is_read = false) {
  return {
    id,
    user_id,
    created_at,
    is_read,
    title: id,
    message: id,
    type: 'task_added',
    related_id: null,
    related_type: null,
    actor_id: null,
    actor_name: null,
    read_at: is_read ? created_at : null,
  };
}

test('Realtime accepts only notifications for the current recipient and ignores duplicate IDs', () => {
  const seen = new Set();

  assert.equal(shouldAcceptRealtimeNotification(notification('n1', 'member-a', '2026-10-27T10:00:00Z'), 'member-a', seen), true);
  assert.equal(shouldAcceptRealtimeNotification(notification('n1', 'member-a', '2026-10-27T10:00:00Z'), 'member-a', seen), false);
  assert.equal(shouldAcceptRealtimeNotification(notification('n2', 'member-b', '2026-10-27T10:01:00Z'), 'member-a', seen), false);
  assert.deepEqual([...seen], ['n1']);
});

test('Initial fetch and a racing Realtime insert merge into a single notification', () => {
  const realtime = notification('n-new', 'member-a', '2026-10-27T10:02:00Z');
  const fetched = [
    notification('n-new', 'member-a', '2026-10-27T10:02:00Z'),
    notification('n-old', 'member-a', '2026-10-27T10:01:00Z'),
  ];

  const merged = mergeNotificationFeed([realtime], fetched, 'member-a');

  assert.deepEqual(merged.map((item) => item.id), ['n-new', 'n-old']);
});

test('The feed excludes other recipients and sorts newest first', () => {
  const merged = mergeNotificationFeed(
    [
      notification('foreign', 'member-b', '2026-10-27T10:05:00Z'),
      notification('realtime-new', 'member-a', '2026-10-27T10:04:00Z'),
    ],
    [
      notification('fetched-old', 'member-a', '2026-10-27T10:02:00Z'),
      notification('also-foreign', 'member-b', '2026-10-27T10:03:00Z'),
    ],
    'member-a'
  );

  assert.deepEqual(merged.map((item) => item.id), ['realtime-new', 'fetched-old']);
});

test('Realtime entries older than the fetched page are not retained as stale state', () => {
  const merged = mergeNotificationFeed(
    [
      notification('stale-realtime', 'member-a', '2026-10-27T10:00:00Z'),
      notification('new-realtime', 'member-a', '2026-10-27T10:04:00Z'),
    ],
    [notification('fetched', 'member-a', '2026-10-27T10:02:00Z')],
    'member-a'
  );

  assert.deepEqual(merged.map((item) => item.id), ['new-realtime', 'fetched']);
});

test('A missing recipient never returns a global notification feed', () => {
  assert.deepEqual(
    mergeNotificationFeed(
      [notification('n1', 'member-a', '2026-10-27T10:00:00Z')],
      [notification('n2', 'member-a', '2026-10-27T10:01:00Z')],
      undefined
    ),
    []
  );
});
