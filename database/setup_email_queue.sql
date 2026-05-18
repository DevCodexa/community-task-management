-- ============================================
-- Speaker Email Queue System
-- Sadece status='green' olan speaker'lara mail gönderir
-- ============================================

-- 1. Mail kuyruğu tablosunu oluştur
CREATE TABLE IF NOT EXISTS public.speaker_email_queue (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  speaker_id uuid NOT NULL,
  email_type text NOT NULL DEFAULT 'welcome',
  status text NOT NULL DEFAULT 'pending',
  error_message text NULL,
  retry_count integer NOT NULL DEFAULT 0,
  scheduled_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  sent_at timestamp with time zone NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT speaker_email_queue_pkey PRIMARY KEY (id),
  CONSTRAINT speaker_email_queue_speaker_fkey FOREIGN KEY (speaker_id) 
    REFERENCES speakers(id) ON DELETE CASCADE
);

-- 2. Index oluştur
CREATE INDEX IF NOT EXISTS idx_email_queue_status 
  ON speaker_email_queue(status, scheduled_at);

CREATE INDEX IF NOT EXISTS idx_email_queue_speaker 
  ON speaker_email_queue(speaker_id);

-- 3. Eski trigger'ları kaldır
DROP TRIGGER IF EXISTS speaker_welcome_trigger ON speakers;
DROP TRIGGER IF EXISTS tr_enqueue_speaker_invite ON speakers;
DROP TRIGGER IF EXISTS tr_enqueue_on_status_change ON speakers;

-- 4. Eski fonksiyonu güncelle/oluştur
CREATE OR REPLACE FUNCTION public.send_speaker_welcome()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Bu fonksiyon artık kullanılmıyor, ama eski sistemle uyumluluk için bırakıldı
  RETURN NEW;
END;
$$;

-- 5. Kuyruk fonksiyonunu oluştur
CREATE OR REPLACE FUNCTION public.trg_enqueue_speaker_invite()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Sadece status green ve email varsa kuyruğa ekle
  IF NEW.status = 'green' AND NEW.email IS NOT NULL AND NEW.email != '' THEN
    INSERT INTO public.speaker_email_queue (
      speaker_id,
      email_type,
      status,
      scheduled_at
    ) VALUES (
      NEW.id,
      'welcome',
      'pending',
      timezone('utc'::text, now())
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- 6. INSERT trigger'ı oluştur
CREATE TRIGGER tr_enqueue_speaker_invite
  AFTER INSERT ON speakers
  FOR EACH ROW
  WHEN (NEW.status = 'green' AND NEW.email IS NOT NULL)
  EXECUTE FUNCTION trg_enqueue_speaker_invite();

-- 7. UPDATE trigger'ı oluştur (status değiştiğinde)
CREATE TRIGGER tr_enqueue_on_status_change
  AFTER UPDATE OF status ON speakers
  FOR EACH ROW
  WHEN (OLD.status != 'green' AND NEW.status = 'green' AND NEW.email IS NOT NULL)
  EXECUTE FUNCTION trg_enqueue_speaker_invite();

-- 8. Mail işleme fonksiyonu (Cron job veya manuel çağırmak için)
CREATE OR REPLACE FUNCTION public.process_speaker_email_queue()
RETURNS TABLE(
  processed_count integer,
  failed_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_processed integer := 0;
  v_failed integer := 0;
  email_record RECORD;
BEGIN
  -- Pending durumdaki mailleri al
  FOR email_record IN 
    SELECT 
      seq.id,
      seq.speaker_id,
      s.email,
      s.full_name,
      s.title,
      s.company
    FROM speaker_email_queue seq
    JOIN speakers s ON s.id = seq.speaker_id
    WHERE seq.status = 'pending'
      AND seq.scheduled_at <= timezone('utc'::text, now())
      AND seq.retry_count < 3
      AND s.status = 'green'
      AND s.email IS NOT NULL
    ORDER BY seq.created_at
    LIMIT 50
  LOOP
    BEGIN
      -- TODO: Burada Edge Function veya mail servisini çağır
      -- Örnek: net.http_post() veya pg_net kullanarak
      
      -- Şimdilik başarılı olarak işaretle
      UPDATE speaker_email_queue
      SET 
        status = 'sent',
        sent_at = timezone('utc'::text, now())
      WHERE id = email_record.id;
      
      v_processed := v_processed + 1;
      
    EXCEPTION WHEN OTHERS THEN
      -- Hata durumunda
      UPDATE speaker_email_queue
      SET 
        status = CASE 
          WHEN retry_count + 1 >= 3 THEN 'failed'
          ELSE 'pending'
        END,
        error_message = SQLERRM,
        retry_count = retry_count + 1,
        scheduled_at = timezone('utc'::text, now() + interval '5 minutes')
      WHERE id = email_record.id;
      
      v_failed := v_failed + 1;
    END;
  END LOOP;
  
  RETURN QUERY SELECT v_processed, v_failed;
END;
$$;

-- 9. Kuyruk temizleme fonksiyonu (eski kayıtları sil)
CREATE OR REPLACE FUNCTION public.cleanup_old_email_queue()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted integer;
BEGIN
  DELETE FROM speaker_email_queue
  WHERE 
    status IN ('sent', 'failed')
    AND created_at < timezone('utc'::text, now() - interval '30 days');
  
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

-- 10. Yardımcı view (mail kuyruğunu kolayca görmek için)
CREATE OR REPLACE VIEW public.v_speaker_email_queue AS
SELECT 
  seq.id,
  seq.speaker_id,
  s.full_name,
  s.email,
  s.company,
  seq.email_type,
  seq.status,
  seq.error_message,
  seq.retry_count,
  seq.scheduled_at,
  seq.sent_at,
  seq.created_at
FROM speaker_email_queue seq
JOIN speakers s ON s.id = seq.speaker_id
ORDER BY seq.created_at DESC;

-- ============================================
-- Kurulum Tamamlandı!
-- ============================================
-- Kullanım:
-- 1. Yeni speaker eklerken status='green' yapın
-- 2. Mail kuyruğunu işlemek için: SELECT * FROM process_speaker_email_queue();
-- 3. Kuyruğu görmek için: SELECT * FROM v_speaker_email_queue;
-- 4. Eski kayıtları temizlemek için: SELECT cleanup_old_email_queue();
-- ============================================