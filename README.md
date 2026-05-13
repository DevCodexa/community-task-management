# Community Task Management

Topluluk uyeleri, gorevleri, etkinlikleri, konusmacilari, yararli linkleri ve bildirimleri yonetmek icin gelistirilmis React + Supabase tabanli bir yonetim panelidir. Uygulama Vite ile calisir, veri katmani Supabase tablolarina baglanir ve gorev/etkinlik atamalarinda e-posta bildirimi icin Supabase Edge Function uzerinden Resend kullanir.

## Teknoloji Yigini

- React 18
- TypeScript
- Vite
- React Router
- Tailwind CSS
- Supabase JS SDK
- Framer Motion
- Lucide React
- Recharts
- Resend e-posta servisi

## Kurulum

```bash
npm install
npm run dev
```

Uygulama varsayilan olarak Vite gelistirme sunucusunda calisir:

```text
http://localhost:5173
```

Uretim paketi almak icin:

```bash
npm run build
```

Derlenen paketi lokal onizlemek icin:

```bash
npm run preview
```

## Ortam Degiskenleri

`.env.example` dosyasi temel degiskenleri gosterir. Lokal calisma icin `.env` veya `.env.local` dosyasi kullanilabilir.

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_RESEND_API_KEY=
VITE_EMAIL_FROM=
VITE_APP_URL=
```

Not: Kod icinde Supabase ve Resend icin fallback degerler bulunuyor. Canli ortamda anahtarlarin sadece ortam degiskenlerinden okunmasi ve repoda acik anahtar tutulmamasi onerilir.

## Uygulama Rotalari

Rotalar `src/App.tsx` icinde tanimlidir.

| Yol | Ekran | Aciklama |
| --- | --- | --- |
| `/` | `LoginScreen` | Giris ekrani |
| `/dashboard` | `Dashboard` | KPI kartlari, gorev dagilimi, son uyeler ve son tamamlanan gorevler |
| `/uyeler` | `MembersPage` | Uye listeleme, ekleme, guncelleme ve detay goruntuleme |
| `/dogum-gunleri` | `BirthdaysPage` | Yaklasan dogum gunleri |
| `/gorev-zinciri` | `TasksPage` | Gorev yonetimi |
| `/linkler` | `LinksPage` | Kategorili yararli linkler |
| `/konusmacilar` | `SpeakersPage` | Konusmaci havuzu |
| `/etkinlikler` | `EventsPage` | Etkinlik, gorevli ve konusmaci atama yonetimi |
| `/ayarlar` | `Dashboard` | Su anda dashboard'a yonleniyor |

## Klasor Yapisi

```text
src/
  App.tsx
  main.tsx
  index.css
  components/
    dashboard/
    events/
    kanban/
    layout/
    links/
    members/
    notifications/
    speakers/
    tasks/
    ui/
  context/
  data/
  hooks/
  lib/
  pages/
  types/
database/
supabase/functions/
```

Ana sorumluluklar:

- `src/pages`: Sayfa seviyesindeki ekranlar.
- `src/components`: Tekrar kullanilabilir UI ve alan bazli bilesenler.
- `src/lib`: Supabase servisleri ve e-posta yardimcilari.
- `src/types`: Veritabani ve form tipleri.
- `src/context`: Tema ve kullanici profili context'leri.
- `database`: Supabase SQL tablo, enum, index, trigger ve RLS scriptleri.
- `supabase/functions`: Edge Function kaynaklari.

## Mimari Ozet

Uygulama istemci tarafinda calisan bir SPA'dir. React Router sayfa gecislerini yonetir. Her ana is alani icin `src/lib/supabase*.ts` dosyalarinda CRUD servisleri bulunur. Sayfalar ve modal bilesenleri bu servisleri kullanarak Supabase tablolarindan veri okur veya yazar.

Genel akis:

1. `main.tsx`, React uygulamasini DOM'a baglar.
2. `App.tsx`, tema ve kullanici profili provider'larini sarar, rotalari tanimlar.
3. `Layout`, sidebar, tema secici, bildirim ikonu ve profil butonunu ortak cerceve olarak sunar.
4. Sayfalar kendi alan servislerini cagirir.
5. Servisler Supabase istemcisi uzerinden tablo sorgularini yapar.
6. Gorev veya etkinlik atamalarinda e-posta bildirimi arka planda tetiklenir.

## Temel Moduller

### Dashboard

`src/components/Dashboard.tsx` icinde bulunur. Asagidaki verileri toplar:

- toplam uye
- toplam konusmaci
- toplam etkinlik/duyuru
- toplam gorev
- gorev tamamlama orani
- gorev durum dagilimi
- son eklenen uyeler
- son tamamlanan gorevler

Veri kaynaklari agirlikli olarak `src/lib/supabaseTasks.ts`, `src/lib/supabaseMembers.ts` ve `src/lib/supabaseSpeakers.ts` dosyalaridir.

### Uye Yonetimi

Ilgili dosyalar:

- `src/components/members/MembersPage.tsx`
- `src/components/members/MemberTable.tsx`
- `src/components/members/MemberModal.tsx`
- `src/lib/supabaseMembers.ts`
- `src/types/member.ts`
- `database/members.sql`

Desteklenen islemler:

- uye listeleme ve arama
- role ve topluluk unvanina gore filtreleme
- uye ekleme, guncelleme, silme
- dogum gunu hesaplama
- gorev kapasitesi kontrolu

Her uye icin `total_tasks` en fazla 3 olacak sekilde tasarlanmistir. `active_tasks`, aktif gorev sayisini temsil eder.

### Gorev Yonetimi

Ilgili dosyalar:

- `src/pages/TasksPage.tsx`
- `src/components/tasks/TaskTable.tsx`
- `src/components/tasks/TaskFormModal.tsx`
- `src/components/tasks/TaskDetailsModal.tsx`
- `src/components/kanban/KanbanBoard.tsx`
- `src/lib/supabaseTasks.ts`
- `src/types/task.ts`
- `database/tasks.sql`

Gorev durumlari:

- `backlog`
- `started`
- `in_progress`
- `completed`
- `done`

Onemli is kurallari:

- Baslik zorunludur ve en az 2 karakter olmalidir.
- Puan 0-100 araligindadir.
- Atanan uye gorev kapasitesini asmamalidir.
- `started` ve `in_progress` aktif gorev kabul edilir.
- Gorev tamamlandiginda veya aktiflikten ciktiginda uyenin aktif gorev sayisi azaltilebilir.
- Gorev atandiginda e-posta bildirimi arka planda gonderilmeye calisilir.

### Etkinlik Yonetimi

Ilgili dosyalar:

- `src/pages/EventsPage.tsx`
- `src/components/events/EventTable.tsx`
- `src/components/events/EventFormModal.tsx`
- `src/lib/supabaseEvents.ts`
- `src/types/event.ts`
- `database/events.sql`

Desteklenen islemler:

- etkinlik listeleme, arama ve tur filtreleme
- etkinlik olusturma, guncelleme, silme
- etkinlige gorevli uye atama
- etkinlige konusmaci atama
- gorevli ve konusmaci sayilarini hesaplama
- yaklasan/gecmis etkinlik sorgulari

Atama tablolari:

- `event_staff`: etkinlik-uye iliskisi
- `event_speakers`: etkinlik-konusmaci iliskisi

Etkinlige gorevli veya konusmaci eklendiginde e-posta bildirimi arka planda tetiklenir.

### Konusmacilar

Ilgili dosyalar:

- `src/pages/SpeakersPage.tsx`
- `src/components/speakers/SpeakerTable.tsx`
- `src/components/speakers/SpeakerModal.tsx`
- `src/components/speakers/SpeakerDetailModal.tsx`
- `src/lib/supabaseSpeakers.ts`
- `src/types/speaker.ts`
- `database/speakers.sql`

Konusmaci kaydi; ad soyad, unvan, sirket, e-posta, telefon, gorsel, aciklama, durum ve ekleyen uye alanlarini icerir. Durum alanlari `green`, `red`, `neutral` olarak kullanilir.

### Yararli Linkler

Ilgili dosyalar:

- `src/pages/LinksPage.tsx`
- `src/components/links/LinkFormModal.tsx`
- `src/lib/supabaseUsefulLinks.ts`
- `database/useful_links.sql`

Desteklenen islemler:

- link listeleme
- kategoriye gore gruplama
- basliga gore arama
- kategori filtreleme
- link ekleme, guncelleme, silme

URL alanlari `http://` veya `https://` ile baslamalidir.

### Bildirimler

Ilgili dosyalar:

- `src/hooks/useNotifications.ts`
- `src/components/notifications/*`
- `src/lib/supabaseNotifications.ts`
- `src/types/notification.ts`
- `database/notifications.sql`

Desteklenen islemler:

- bildirim listeleme
- okunmamis sayisi
- okundu isaretleme
- tumunu okundu isaretleme
- okunanlari veya tum bildirimleri silme
- Supabase realtime INSERT aboneligi
- uygulama acilisinda dogum gunu kontrolu icin `check_birthdays_today` RPC cagrisi

### Tema ve Layout

`ThemeContext` tema secimini yonetir. `Layout`, uygulama cercevesini, sidebar'i, ust bar'i, bildirim konteynerini ve profil butonunu sunar.

Mevcut tema secenekleri:

- `dark`
- `blueMor`
- `iceBlue`

## Veritabani

SQL scriptleri `database/` altindadir. Temel kurulum sirasi genellikle soyledir:

1. `members.sql`
2. `tasks.sql`
3. `speakers.sql`
4. `events.sql`
5. `useful_links.sql`
6. `notifications.sql`

Bazi dosyalar alternatif veya duzeltme scriptleri gibi gorunuyor:

- `events-fixed.sql`
- `events-full-reset.sql`
- `events-security-fix.sql`
- `events-simple-final.sql`
- `speakers-rls-fix.sql`

Canli ortamda hangi SQL dosyasinin guncel kaynak kabul edildigi netlestirilmeli ve eski reset/fix scriptleri ayrica isimlendirilmelidir.

## E-posta Bildirimleri

E-posta akisinda istemci kodu `src/lib/resend.ts` dosyasini kullanir. Bu dosya dogrudan Resend API'sine gitmek yerine Supabase Edge Function endpoint'ine istek atar:

```text
{VITE_SUPABASE_URL}/functions/v1/resend-email
```

Edge Function kaynaklari:

- `supabase/functions/resend-email/index.ts`
- `supabase/functions/_shared/cors.ts`

E-posta tetiklenen senaryolar:

- gorev atamasi
- etkinlige gorevli ekleme
- etkinlige konusmaci ekleme

## Guvenlik ve Dikkat Edilecek Noktalar

- `src/lib/supabase.ts`, `.env.example` ve `src/lib/resend.ts` icinde gercek anahtar gibi gorunen fallback degerler bulunuyor. Bunlar repodan kaldirilmali, sadece ortam degiskenleri kullanilmali.
- Bazi SQL dosyalarinda RLS gelistirme kolayligi icin anon role'a genis CRUD yetkisi veriyor veya RLS kapatiliyor. Canli ortam icin rol bazli politikalar tekrar tasarlanmalidir.
- `src/lib/supabaseTasks.ts` icindeki `ensureAuth`, gorev listelemede Supabase session isterken diger servislerin cogu anon erisim varsayiyor. Kimlik dogrulama modeli tutarli hale getirilmeli.
- E-posta HTML icerikleri istemci tarafinda uretiliyor. Daha guvenli ve yonetilebilir bir yapi icin template uretimi Edge Function veya backend tarafina alinabilir.
- `database/events.sql` icindeki `event_type_enum` satiri sozdizimi acisindan kontrol edilmeli; enum degerleri arasinda eksik virgul gorunuyor.
- Kodda debug amacli `console.log` ve `console.warn` kullanimlari yaygin. Uretim ortaminda azaltilmasi onerilir.
- `node_modules/` git tarafindan izlenmeyen dosya olarak gorunuyor. `.gitignore` dosyasi kontrol edilmeli veya eklenmelidir.

## Gelistirme Notlari

- UI tarafinda Tailwind utility class'lari ve CSS degiskenleri birlikte kullaniliyor.
- Bilesenler alan bazli klasorlenmis durumda; yeni bir modul eklenirken `types`, `lib`, `pages/components` ayrimini korumak daha okunabilir olur.
- Servis fonksiyonlari hata yakalayip kullaniciya daha anlamli mesaj dondurmeye calisiyor.
- Sayfalama servis seviyesinde standart olarak `page`, `limit`, `total`, `totalPages`, `hasNext`, `hasPrev` alanlariyla donuyor.
- Tarih gosterimlerinde Turkce locale (`tr-TR`) kullaniliyor.

## Onerilen Sonraki Iyilestirmeler

1. Gizli anahtarlar repodan temizlenmeli ve Supabase/Resend anahtarlari rotate edilmeli.
2. `.gitignore` eklenerek `node_modules`, `dist`, `.env`, `.env.local` gibi dosyalar izleme disinda tutulmali.
3. SQL scriptleri tek bir guncel migration akisina toparlanmali.
4. RLS politikalari canli kullanima uygun hale getirilmeli.
5. Auth akisinin hangi sayfalari koruyacagi netlestirilmeli.
6. Unit/integration test altyapisi eklenmeli.
7. TypeScript strict kontrolleri ve lint/format scriptleri eklenmeli.
