## Email-worker migrasyonu (durum takibi)

- [ ] Backend yokluğunu doğrula (Express/Nest entrypoint mevcut değil)
- [ ] Email-worker cron/polling mantığını tek Node process’e taşıyacak yeni server giriş noktası tasarla (tek repo/tek servis)
- [ ] Supabase speaker_email_queue + brevo send + status/retry güncelleme akışını ana uygulamaya bağla
- [ ] Render deployment: sadece tek web service (worker ayrı olmayacak)
- [ ] email-worker dizinini tamamen kaldır
- [ ] Build/start komutları: sadece `node dist/index.js` çalışacak
- [ ] Uygulama başlangıcında worker otomatik başlamalı