# TODO

## Completed
- (placeholder)

## Next steps
1. Repo içinde `members` insert/upsert ile ilgili 409 Conflict akışını doğrula.
2. Mail gönderimini idempotent yapmak için `email_logs` mekanizmasını ekle (DB + kod).
3. Supabase DB tarafında `email_logs` tablosu ve unique index (type,to) oluşturuldu.
4. `createMember()` içinde onboarding maili, `email_logs` içine ilk kez insert olunca gönder.
5. RLS/policy ayarlarını doğrula.
6. Test: Aynı üyeyi iki kez create et / aynı request’i yeniden gönder → mail sadece 1 kez gitmeli.


