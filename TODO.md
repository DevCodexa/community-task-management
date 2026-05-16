# TODO - Done → 7 Gün Sonra Arşiv

- [ ] Repo içinde mevcut task/kanban/arşiv akışını incele (tamamlandı: KanbanBoard/TaskTable/TasksPage/SupabaseTasks okundu)
- [x] DB tarafı için yeni arşiv tablosu şeması tasarla (archived_tasks)
- [x] `archive_done_tasks_older_than_7_days()` DB function’ını yaz
- [x] Done->Arşive taşıma için trigger/manuel çağrılabilir script planla
- [ ] `src/lib/supabaseTasks.ts` içine `getArchivedTasks()` ekle (şimdilik ayrı service: `supabaseTasksArchive.ts`)
- [x] `src/components/tasks/ArchivedTaskTable.tsx` yeni component ekle (tamamlayan/tamamlanma tarihi sütunlarıyla)
- [x] `src/pages/TasksPage.tsx` içine Arşiv butonu + viewMode `archive` ekle
- [ ] Build/dev çalıştır ve arşiv görünümünü test et


