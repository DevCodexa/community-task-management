import type { FullNotification } from '../types/notification';

export declare function shouldAcceptRealtimeNotification(
  notification: FullNotification,
  userId: string,
  seenIds: Set<string>
): boolean;

export declare function mergeNotificationFeed(
  existingNotifications: FullNotification[],
  fetchedNotifications: FullNotification[],
  userId: string
): FullNotification[];
