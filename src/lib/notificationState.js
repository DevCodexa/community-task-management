export function shouldAcceptRealtimeNotification(notification, userId, seenIds) {
  if (!userId || notification.user_id !== userId || seenIds.has(notification.id)) {
    return false;
  }

  seenIds.add(notification.id);
  return true;
}

export function mergeNotificationFeed(existingNotifications, fetchedNotifications, userId) {
  if (!userId) return [];

  const recipientFetched = fetchedNotifications.filter((notification) => notification.user_id === userId);
  const fetchedIds = new Set(recipientFetched.map((notification) => notification.id));
  const fetchedTimestamps = recipientFetched
    .map((notification) => new Date(notification.created_at).getTime())
    .filter(Number.isFinite);
  const newestFetchedAt = fetchedTimestamps.length ? Math.max(...fetchedTimestamps) : null;

  const realtimeOnly = existingNotifications.filter((notification) => {
    if (notification.user_id !== userId || fetchedIds.has(notification.id)) return false;
    if (newestFetchedAt === null) return true;
    return new Date(notification.created_at).getTime() > newestFetchedAt;
  });

  const unique = new Map();
  for (const notification of [...realtimeOnly, ...recipientFetched]) {
    if (!unique.has(notification.id)) unique.set(notification.id, notification);
  }

  return [...unique.values()].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}
