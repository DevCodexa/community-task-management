export type NotificationChange =
  | { userId: string; type: 'read' | 'delete'; id: string }
  | { userId: string; type: 'read-all' | 'clear-all' };

const listeners = new Set<(change: NotificationChange) => void>();

export function publishNotificationChange(change: NotificationChange): void {
  for (const listener of listeners) listener(change);
}

export function subscribeNotificationChanges(listener: (change: NotificationChange) => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
