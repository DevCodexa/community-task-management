# TODO - Proje üye ataması (org_project_members)

## Plan
1. DB: `org_project_members` tablosu + indeks + unique constraint oluştur.
2. DB: RLS policy’leri ekle (insert/select/delete gerekebilir).
3. Backend: `src/lib/supabaseOrgHierarchy.ts`
   - `setProjectMembers(payload)` fonksiyonunu ekle (project_id + memberIds).
   - `createProject` ve `updateProject` sonrası proje üyeliklerini yaz.
4. Frontend: `src/components/org/ProjectModal.tsx`
   - `handleSubmit` içinde `selectedMemberIds` boş değilse `setProjectMembers` çağır.
5. (Opsiyonel) Proje silince `org_project_members` cascade silinsin (FK ON DELETE CASCADE).
6. Test: 
   - Alanlar sayfasında member seç → Proje ekle → Proje sayfasında ekip sayısı artık 0 olmamalı.
   - Proje düzenle: member değiştirince sync olmalı.

