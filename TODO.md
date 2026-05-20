# TODO

## Email logs için (task/performance debug)
- [x] Email-worker içindeki worker akışına her queue item için `insertSendLog` çağrısı öncesi/sonrası log ekle.
- [ ] (Sonraki adım) Worker loglarında `insertSendLog ERROR` var mı kontrol et; yoksa `email_send_logs` RLS/permission veya column mismatch ihtimalini doğrula.
- [ ] (Sonraki adım) `email_send_logs` insert’inde hata alınıyorsa error message + Supabase response detaylarını loglayacak şekilde genişlet.
- [ ] `insertSendLog` içinde `queue_id` tipini (DB: bigint) string yerine Number/BigInt’a çevir (schema mismatch düzelt).
- [ ] Deploy tekrar çalıştır; rollback/exit status 1 sorunu çözülmüş mü kontrol et.


