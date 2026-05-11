- [ ] Repo genelinde `resend` kalıntılarını bul ve listele (src/lib ve supabase/functions + SQL + dokümanlar)
- [ ] `src/lib/resend.ts` dosyasını kaldır (artık kullanılmıyor olmalı)
- [ ] `supabase/functions/resend-email` klasörünü kaldır (edge function artık kullanılmıyor olmalı)
- [ ] `dist/` build çıktılarını temizle ve tekrar build al (minify edilmiş JS içindeki resend kalıntıları kalkmalı)
- [ ] Görev/üyelik bildirimlerini tetikleyen DB Trigger veya Edge Function’ları bul
- [ ] Bildirim tetikleyicilerinden çıkan mail akışını yeni `supabase/functions/brevo-email` endpoint’ine yönlendir
- [ ] Tüm mail trafiğini Brevo SMTP merkezli tek yapı yap (tek wrapper / tek endpoint)
- [ ] Build/test çalıştır ve “task assign + new member” mail trafiğini doğrula

