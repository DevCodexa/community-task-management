# TODO - Email Worker (Brevo + Supabase)

- [ ] Plan onaylandı.
- [ ] `email-worker/` dizinini ve Node/TS proje iskeletini oluştur.
- [ ] `email-worker/package.json` ve `email-worker/tsconfig.json` dosyalarını ekle.
- [ ] İstenen 10+ dosyayı (types, supabaseClient, settingsLoader, templateEngine, brevo, worker, index, package, tsconfig, env) tam içerik olarak oluştur.
- [ ] Worker mantığını DB şemasıyla uyumlu hale getir (günlük limit, öncelik, retry, batch=50, loglar, idempotency).
- [ ] Basit compile testi: `email-worker` klasöründe `npm i` + `npm run build`.

