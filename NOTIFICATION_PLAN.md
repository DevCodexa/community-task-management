# Bildirim Sistemi (Notification System) - Implementation Plan

## 📋 Plan Summary

### Information Gathered
After analyzing the existing codebase:
- **Tech Stack:** React + Vite + TypeScript + Tailwind CSS + Framer Motion + Supabase
- **Theme:** Zincir Atarlı - Dark theme (coal-900/coal-800 backgrounds, silver text)
- **Pattern:** Services in `lib/supabase*.ts`, Types in `types/*.ts`, Components organized by feature
- **Existing Tables:** `members`, `tasks` with RLS enabled, triggers for updated_at
- **Animations:** Framer Motion with spring animations, glow effects

### Implementation Plan

#### Phase 1: Backend (SQL)
1. **database/notifications.sql** - Notifications table, RLS, triggers on tasks/members

#### Phase 2: Type Definitions 
2. **src/types/notification.ts** - Notification interface, types enum, query types

#### Phase 3: Service Layer
3. **src/lib/supabaseNotifications.ts** - CRUD operations, real-time subscription

#### Phase 4: Custom Hooks
4. **src/hooks/useNotifications.ts** - State management, unread count, real-time updates

#### Phase 5: UI Components
5. **src/components/notifications/NavbarBell.tsx** - Bell icon with shake animation + badge
6. **src/components/notifications/NotificationDropdown.tsx** - Dark theme dropdown menu
7. **src/components/notifications/NotificationDetailModal.tsx** - Detail modal popup

#### Phase 6: Integration
8. **src/components/layout/Layout.tsx** - Add NavbarBell to Layout
9. **Birthday Logic** - Check birthdays on app load

### Dependent Files to be Created
- `database/notifications.sql`
- `src/types/notification.ts`
- `src/lib/supabaseNotifications.ts`
- `src/hooks/useNotifications.ts`
- `src/components/notifications/NavbarBell.tsx`
- `src/components/notifications/NotificationDropdown.tsx`
- `src/components/notifications/NotificationDetailModal.tsx`

### Followup Steps
1. Test SQL script in Supabase SQL Editor
2. Test frontend components
3. Verify real-time subscription works
4. Check birthday notification logic
