# TODO

## Brevo API Key ile Edge Function güncelleme
- [x] Repo içindeki mevcut email Edge Function’ı tespit et: `supabase/functions/brevo-email/index.ts`
- [x] `BREVO_API_KEY` var ise Brevo HTTP API (POST https://api.brevo.com/v3/smtp/email) ile mail gönderimi ekle

- [x] `BREVO_API_KEY` yok ise mevcut nodemailer SMTP fallback’i koru
- [x] API öncelikli akış uygula (key varsa SMTP kullanılmasın)
- [x] Hata durumlarında detaylı loglama ekle (fetch status/body, env eksikleri)
- [x] Response formatını her durumda `{ success, messageId?, error? }` olarak koru
- [x] CORS header’larını koru

- [ ] TypeScript/deno build/lint için komut çalıştır (varsa)
- [x] BREVO_API_KEY’in local geliştirme için `.env`/secret yönetimi notları eklendi


