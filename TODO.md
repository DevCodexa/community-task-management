# TODO.md

## Archive Tasks Paging (10 kayıt/sayfa)
- [ ] 1) `src/pages/TasksPage.tsx` içine arşiv sayfalama state’leri ekle (page, limit=10, total, hasPrev/hasNext).
- [ ] 2) `viewMode === 'archive'` iken `getArchivedTasks({ page, limit })` çağır.
- [ ] 3) `src/components/tasks/ArchivedTaskTable.tsx` içine sayfalama UI (Önceki / current / Sonraki) ekle.
- [ ] 4) Arşiv modunda sayfa değişince tekrar fetch yap.
- [x] 5) Hata olmadan derleme/test (npm run build veya dev build) çalıştır.


