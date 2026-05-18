-- ============================================================
-- Email System (Brevo-friendly) + Birthday Cron Idempotency
-- Full & Final Migration — Supabase (Postgres)
-- ============================================================

-- ------------------------------------------------------------
-- ENUM Types
-- ------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'email_queue_status_enum') THEN
    CREATE TYPE email_queue_status_enum AS ENUM ('pending', 'sent', 'failed');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'email_priority_enum') THEN
    CREATE TYPE email_priority_enum AS ENUM ('low', 'medium', 'high');
  END IF;
END $$;

-- ------------------------------------------------------------
-- members tablosuna is_active kolonu ekle
-- ------------------------------------------------------------
ALTER TABLE members
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

UPDATE members SET is_active = true WHERE is_active IS NULL;

-- ------------------------------------------------------------
-- 1) email_templates
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS email_templates (
  id                bigserial    PRIMARY KEY,
  template_name     varchar(100) NOT NULL,
  template_code     varchar(50)  UNIQUE NOT NULL,
  brevo_template_id int          NULL,
  subject           varchar(200) NOT NULL,
  html_content      text         NOT NULL,
  is_active         boolean      NOT NULL DEFAULT true,
  created_at        timestamptz  NOT NULL DEFAULT timezone('utc', now())
);

-- ------------------------------------------------------------
-- 2) email_queue
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS email_queue (
  id               bigserial               PRIMARY KEY,
  recipient_email  varchar(255)            NOT NULL,
  recipient_name   varchar(255)            NULL,
  template_code    varchar(50)             NOT NULL
                     REFERENCES email_templates(template_code) ON DELETE RESTRICT,
  template_params  jsonb                   NOT NULL DEFAULT '{}'::jsonb,
  priority         email_priority_enum     NOT NULL DEFAULT 'medium',
  status           email_queue_status_enum NOT NULL DEFAULT 'pending',
  attempt_count    int                     NOT NULL DEFAULT 0,
  last_attempt_at  timestamptz             NULL,
  sent_at          timestamptz             NULL,
  error_message    text                    NULL,
  brevo_message_id varchar(255)            NULL,
  created_at       timestamptz             NOT NULL DEFAULT timezone('utc', now()),
  updated_at       timestamptz             NOT NULL DEFAULT timezone('utc', now())
);

CREATE OR REPLACE FUNCTION email_queue_set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_email_queue_updated_at ON email_queue;
CREATE TRIGGER trg_email_queue_updated_at
BEFORE UPDATE ON email_queue
FOR EACH ROW EXECUTE FUNCTION email_queue_set_updated_at();

CREATE INDEX IF NOT EXISTS idx_email_queue_status     ON email_queue(status);
CREATE INDEX IF NOT EXISTS idx_email_queue_created_at ON email_queue(created_at);

-- ------------------------------------------------------------
-- 3) email_send_logs
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS email_send_logs (
  id              bigserial    PRIMARY KEY,
  queue_id        bigint       NOT NULL REFERENCES email_queue(id) ON DELETE CASCADE,
  recipient_email varchar(255) NOT NULL,
  template_code   varchar(50)  NOT NULL,
  event_type      varchar(50)  NOT NULL DEFAULT 'sent',
  event_data      jsonb        NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz  NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_email_send_logs_event_type      ON email_send_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_email_send_logs_recipient_email ON email_send_logs(recipient_email);

-- ------------------------------------------------------------
-- 4) email_settings
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS email_settings (
  id            bigserial    PRIMARY KEY,
  setting_key   varchar(100) UNIQUE NOT NULL,
  setting_value text         NULL,
  updated_at    timestamptz  NOT NULL DEFAULT timezone('utc', now())
);

CREATE OR REPLACE FUNCTION email_settings_set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_email_settings_updated_at ON email_settings;
CREATE TRIGGER trg_email_settings_updated_at
BEFORE UPDATE ON email_settings
FOR EACH ROW EXECUTE FUNCTION email_settings_set_updated_at();

-- Seed (idempotent)
INSERT INTO email_settings (setting_key, setting_value)
SELECT k, v FROM (VALUES
  ('brevo_api_key',  'YOUR_BREVO_API_KEY_HERE'),
  ('sender_email',   'noreply@yourdomain.com'),
  ('sender_name',    'Uygulama Adı'),
  ('daily_limit',    '300'),
  ('retry_limit',    '3'),
  ('enabled',        'true')
) AS t(k, v)
WHERE NOT EXISTS (
  SELECT 1 FROM email_settings WHERE setting_key = t.k
);

-- ------------------------------------------------------------
-- 5) birthday_notifications
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS birthday_notifications (
  id                    bigserial   PRIMARY KEY,
  birthday_person_id    uuid        NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  notification_year     int         NOT NULL,
  personal_mail_sent    boolean     NOT NULL DEFAULT false,
  team_mails_sent_count int         NOT NULL DEFAULT 0,
  sent_at               timestamptz NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (birthday_person_id, notification_year)
);

-- ------------------------------------------------------------
-- RLS (idempotent: DROP IF EXISTS → CREATE)
-- ------------------------------------------------------------

-- email_templates
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon to read email_templates" ON email_templates;
CREATE POLICY "Allow anon to read email_templates"
  ON email_templates FOR SELECT TO anon USING (true);

-- email_queue
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon to read email_queue"   ON email_queue;
DROP POLICY IF EXISTS "Allow anon to insert email_queue" ON email_queue;
DROP POLICY IF EXISTS "Allow anon to update email_queue" ON email_queue;
CREATE POLICY "Allow anon to read email_queue"
  ON email_queue FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon to insert email_queue"
  ON email_queue FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon to update email_queue"
  ON email_queue FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- email_send_logs
ALTER TABLE email_send_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon to read email_send_logs"   ON email_send_logs;
DROP POLICY IF EXISTS "Allow anon to insert email_send_logs" ON email_send_logs;
CREATE POLICY "Allow anon to read email_send_logs"
  ON email_send_logs FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon to insert email_send_logs"
  ON email_send_logs FOR INSERT TO anon WITH CHECK (true);

-- email_settings
ALTER TABLE email_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon to read email_settings"   ON email_settings;
DROP POLICY IF EXISTS "Allow anon to insert email_settings" ON email_settings;
DROP POLICY IF EXISTS "Allow anon to update email_settings" ON email_settings;
CREATE POLICY "Allow anon to read email_settings"
  ON email_settings FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon to insert email_settings"
  ON email_settings FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon to update email_settings"
  ON email_settings FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- birthday_notifications
ALTER TABLE birthday_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon to read birthday_notifications"   ON birthday_notifications;
DROP POLICY IF EXISTS "Allow anon to insert birthday_notifications" ON birthday_notifications;
DROP POLICY IF EXISTS "Allow anon to update birthday_notifications" ON birthday_notifications;
CREATE POLICY "Allow anon to read birthday_notifications"
  ON birthday_notifications FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon to insert birthday_notifications"
  ON birthday_notifications FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon to update birthday_notifications"
  ON birthday_notifications FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- ------------------------------------------------------------
-- 6) Seed Templates (idempotent)
-- ------------------------------------------------------------
INSERT INTO email_templates
  (template_name, template_code, brevo_template_id, subject, html_content, is_active)
VALUES

  (
    'Hoş Geldin Maili', 'welcome_member', null,
    'Aramıza Hoş Geldin! 🎉',
    '<h1>Aramıza hoş geldin, {{member_name}}! 🎉</h1>'
    '<p>Topluluğumuza katıldığın için çok mutluyuz.</p>'
    '<p>Katılım tarihi: {{join_date}}</p>',
    true
  ),

  (
    'Göreve Atama', 'task_assigned', null,
    'Yeni Bir Göreve Atandınız ✅',
    '<h2>Yeni görev ataması! ✅</h2>'
    '<p>Merhaba {{member_name}},</p>'
    '<p>Sana şu görev atandı: <strong>{{task_name}}</strong></p>'
    '<p>Son tarih: {{deadline}}</p>',
    true
  ),

  (
    'Proje Üyeliği', 'project_member', null,
    'Bir Projeye Eklendiniz 📁',
    '<h2>Proje Üyeliği 📁</h2>'
    '<p>Merhaba {{member_name}},</p>'
    '<p>Şu projeye eklendiniz: <strong>{{project_name}}</strong></p>',
    true
  ),

  (
    'Bölüm Üyeliği', 'department_member', null,
    'Bir Bölüme Eklendiniz 🏢',
    '<h2>Bölüm Üyeliği 🏢</h2>'
    '<p>Merhaba {{member_name}},</p>'
    '<p>Şu bölüme eklendiniz: <strong>{{department_name}}</strong></p>',
    true
  ),

  (
    'Alan Üyeliği', 'area_member', null,
    'Bir Alana Eklendiniz 📌',
    '<h2>Alan Üyeliği 📌</h2>'
    '<p>Merhaba {{member_name}},</p>'
    '<p>Şu alana eklendiniz: <strong>{{area_name}}</strong></p>',
    true
  ),

  (
    'Üye Alan Ataması', 'member_area_assigned', null,
    'Yeni Bir Alana Atandınız 📌',
    '<h2>Alan Ataması 📌</h2>'
    '<p>Merhaba {{member_name}},</p>'
    '<p>Şu alana atandınız: <strong>{{area_name}}</strong></p>',
    true
  ),

  (
    'Konuşmacı Kaydı', 'speaker_invite', null,
    'Konuşmacı Olarak Kaydedildiniz 🎤',
    '<h2>Hoş Geldiniz, {{speaker_name}}! 🎤</h2>'
    '<p>Sistemimize konuşmacı olarak başarıyla kaydedildiniz.</p>'
    '<p>Unvan: {{speaker_title}}</p>'
    '<p>Şirket: {{speaker_company}}</p>',
    true
  ),

  (
    'Etkinlik Konuşmacısı', 'event_speaker', null,
    'Bir Etkinliğe Konuşmacı Olarak Eklendiniz 🎙️',
    '<h2>Etkinlik Konuşmacısı 🎙️</h2>'
    '<p>Sayın {{speaker_name}},</p>'
    '<p><strong>{{event_name}}</strong> etkinliğine konuşmacı olarak eklendiniz.</p>'
    '<p>Etkinlik tarihi: {{event_date}}</p>'
    '<p>Konum: {{event_location}}</p>',
    true
  ),

  (
    'Etkinlik Görevlisi', 'event_staff_member', null,
    'Bir Etkinlikte Görevlendirildiniz 📋',
    '<h2>Etkinlik Görevlendirmesi 📋</h2>'
    '<p>Merhaba {{member_name}},</p>'
    '<p><strong>{{event_name}}</strong> etkinliğinde görevlendirildiniz.</p>'
    '<p>Etkinlik tarihi: {{event_date}}</p>'
    '<p>Konum: {{event_location}}</p>',
    true
  ),

  (
    'Genel Duyuru', 'announcement_general', null,
    'Yeni Duyuru: {{announcement_title}} 📢',
    '<h2>Yeni Duyuru 📢</h2>'
    '<p>Merhaba {{member_name}},</p>'
    '<p><strong>{{announcement_title}}</strong></p>'
    '<p>{{announcement_description}}</p>',
    true
  ),

  (
    'Kişisel Duyuru', 'announcement_member', null,
    'Size Özel Bir Duyuru Var 📬',
    '<h2>Kişisel Duyuru 📬</h2>'
    '<p>Merhaba {{member_name}},</p>'
    '<p><strong>{{announcement_title}}</strong></p>'
    '<p>{{announcement_body}}</p>',
    true
  ),

  (
    'Doğum Günü Kişisel', 'birthday_personal', null,
    'Doğum Günün Kutlu Olsun! 🎉',
    '<h1>İyi ki doğdun, {{member_name}}! 🎂</h1>'
    '<p>Tüm ekip olarak nice mutlu yıllara diliyoruz.</p>',
    true
  ),

  (
    'Doğum Günü Takım', 'birthday_team', null,
    'Bugün Ekip Arkadaşımızın Doğum Günü! 🎈',
    '<h1>Ekibimizin Bir Üyesinin Doğum Günü! 🎈</h1>'
    '<p>Bugün <strong>{{birthday_person}}</strong> doğum gününü kutluyor.</p>'
    '<p>Hep birlikte kutlayalım! 🥳</p>',
    true
  )

ON CONFLICT (template_code) DO UPDATE
  SET template_name     = EXCLUDED.template_name,
      brevo_template_id = EXCLUDED.brevo_template_id,
      subject           = EXCLUDED.subject,
      html_content      = EXCLUDED.html_content,
      is_active         = EXCLUDED.is_active;

-- ------------------------------------------------------------
-- 7) enqueue_email yardımcı fonksiyonu
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION enqueue_email(
  p_recipient_email varchar,
  p_recipient_name  varchar,
  p_template_code   varchar,
  p_template_params jsonb,
  p_priority        email_priority_enum DEFAULT 'medium'
)
RETURNS void AS $$
BEGIN
  INSERT INTO email_queue
    (recipient_email, recipient_name, template_code, template_params, priority, status)
  VALUES (
    p_recipient_email,
    p_recipient_name,
    p_template_code,
    COALESCE(p_template_params, '{}'::jsonb),
    p_priority,
    'pending'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 8) TRIGGERLAR
-- ============================================================

-- ------------------------------------------------------------
-- 8.1 members INSERT → welcome_member
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_enqueue_welcome_member()
RETURNS trigger AS $$
BEGIN
  IF NEW.email IS NULL OR NEW.is_active = false THEN
    RETURN NEW;
  END IF;

  PERFORM enqueue_email(
    NEW.email,
    NEW.name,
    'welcome_member',
    jsonb_build_object(
      'member_name', COALESCE(NEW.name, 'Üye'),
      'join_date',   to_char(COALESCE(NEW.created_at, now()), 'DD.MM.YYYY')
    ),
    'medium'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_enqueue_welcome_member ON members;
CREATE TRIGGER tr_enqueue_welcome_member
AFTER INSERT ON members
FOR EACH ROW EXECUTE FUNCTION trg_enqueue_welcome_member();

-- ------------------------------------------------------------
-- 8.2 & 8.3 tasks INSERT / UPDATE → task_assigned
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_enqueue_task_assigned()
RETURNS trigger AS $$
DECLARE
  v_email    varchar;
  v_name     varchar;
  v_deadline text;
BEGIN
  IF NEW.assignee_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND
     OLD.assignee_id IS NOT DISTINCT FROM NEW.assignee_id THEN
    RETURN NEW;
  END IF;

  SELECT m.email, m.name
    INTO v_email, v_name
    FROM members m
   WHERE m.id = NEW.assignee_id
     AND m.is_active = true
   LIMIT 1;

  IF v_email IS NOT NULL THEN
    v_deadline := CASE
      WHEN NEW.deadline IS NOT NULL
      THEN to_char(NEW.deadline, 'DD.MM.YYYY')
      ELSE 'Belirtilmemiş'
    END;

    PERFORM enqueue_email(
      v_email,
      v_name,
      'task_assigned',
      jsonb_build_object(
        'member_name', COALESCE(v_name, 'Üye'),
        'task_name',   COALESCE(NEW.title, 'Yeni Görev'),
        'deadline',    v_deadline
      ),
      'high'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_enqueue_task_assigned        ON tasks;
DROP TRIGGER IF EXISTS tr_enqueue_task_assigned_insert ON tasks;
DROP TRIGGER IF EXISTS tr_enqueue_task_assigned_update ON tasks;

CREATE TRIGGER tr_enqueue_task_assigned_insert
AFTER INSERT ON tasks
FOR EACH ROW EXECUTE FUNCTION trg_enqueue_task_assigned();

CREATE TRIGGER tr_enqueue_task_assigned_update
AFTER UPDATE ON tasks
FOR EACH ROW EXECUTE FUNCTION trg_enqueue_task_assigned();

-- ------------------------------------------------------------
-- 8.4 org_project_members INSERT → project_member
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_enqueue_project_member()
RETURNS trigger AS $$
DECLARE
  v_email        varchar;
  v_name         varchar;
  v_project_name varchar;
BEGIN
  SELECT m.email, m.name
    INTO v_email, v_name
    FROM members m
   WHERE m.id = NEW.user_id
     AND m.is_active = true;

  SELECT p.title
    INTO v_project_name
    FROM org_projects p
   WHERE p.id = NEW.project_id;

  IF v_email IS NOT NULL AND v_project_name IS NOT NULL THEN
    PERFORM enqueue_email(
      v_email, v_name,
      'project_member',
      jsonb_build_object(
        'member_name',  COALESCE(v_name, 'Üye'),
        'project_name', v_project_name
      ),
      'medium'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_enqueue_project_member ON org_project_members;
CREATE TRIGGER tr_enqueue_project_member
AFTER INSERT ON org_project_members
FOR EACH ROW EXECUTE FUNCTION trg_enqueue_project_member();

-- ------------------------------------------------------------
-- 8.5 org_department_members INSERT → department_member
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_enqueue_department_member()
RETURNS trigger AS $$
DECLARE
  v_email           varchar;
  v_name            varchar;
  v_department_name varchar;
BEGIN
  SELECT m.email, m.name
    INTO v_email, v_name
    FROM members m
   WHERE m.id = NEW.user_id
     AND m.is_active = true;

  SELECT d.title
    INTO v_department_name
    FROM org_departments d
   WHERE d.id = NEW.department_id;

  IF v_email IS NOT NULL AND v_department_name IS NOT NULL THEN
    PERFORM enqueue_email(
      v_email, v_name,
      'department_member',
      jsonb_build_object(
        'member_name',     COALESCE(v_name, 'Üye'),
        'department_name', v_department_name
      ),
      'medium'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_enqueue_department_member ON org_department_members;
CREATE TRIGGER tr_enqueue_department_member
AFTER INSERT ON org_department_members
FOR EACH ROW EXECUTE FUNCTION trg_enqueue_department_member();

-- ------------------------------------------------------------
-- 8.6 org_area_members INSERT → area_member
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_enqueue_area_member()
RETURNS trigger AS $$
DECLARE
  v_email     varchar;
  v_name      varchar;
  v_area_name varchar;
BEGIN
  SELECT m.email, m.name
    INTO v_email, v_name
    FROM members m
   WHERE m.id = NEW.user_id
     AND m.is_active = true;

  SELECT a.title
    INTO v_area_name
    FROM org_areas a
   WHERE a.id = NEW.area_id;

  IF v_email IS NOT NULL AND v_area_name IS NOT NULL THEN
    PERFORM enqueue_email(
      v_email, v_name,
      'area_member',
      jsonb_build_object(
        'member_name', COALESCE(v_name, 'Üye'),
        'area_name',   v_area_name
      ),
      'medium'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_enqueue_area_member ON org_area_members;
CREATE TRIGGER tr_enqueue_area_member
AFTER INSERT ON org_area_members
FOR EACH ROW EXECUTE FUNCTION trg_enqueue_area_member();

-- ------------------------------------------------------------
-- 8.7 member_areas INSERT → member_area_assigned
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_enqueue_member_area_assigned()
RETURNS trigger AS $$
DECLARE
  v_email varchar;
  v_name  varchar;
BEGIN
  SELECT m.email, m.name
    INTO v_email, v_name
    FROM members m
   WHERE m.id = NEW.profile_id
     AND m.is_active = true;

  IF v_email IS NOT NULL AND NEW.area_name IS NOT NULL THEN
    PERFORM enqueue_email(
      v_email, v_name,
      'member_area_assigned',
      jsonb_build_object(
        'member_name', COALESCE(v_name, 'Üye'),
        'area_name',   NEW.area_name
      ),
      'medium'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_enqueue_member_area_assigned ON member_areas;
CREATE TRIGGER tr_enqueue_member_area_assigned
AFTER INSERT ON member_areas
FOR EACH ROW EXECUTE FUNCTION trg_enqueue_member_area_assigned();

-- ------------------------------------------------------------
-- 8.8 speakers INSERT → speaker_invite
-- speakers tablosunun kendi email kolonu kullanılır
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_enqueue_speaker_invite()
RETURNS trigger AS $$
BEGIN
  IF NEW.email IS NULL THEN
    RETURN NEW;
  END IF;

  PERFORM enqueue_email(
    NEW.email,
    NEW.full_name,
    'speaker_invite',
    jsonb_build_object(
      'speaker_name',    COALESCE(NEW.full_name, 'Konuşmacı'),
      'speaker_title',   COALESCE(NEW.title, '-'),
      'speaker_company', COALESCE(NEW.company, '-')
    ),
    'high'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_enqueue_speaker_invite ON speakers;
CREATE TRIGGER tr_enqueue_speaker_invite
AFTER INSERT ON speakers
FOR EACH ROW EXECUTE FUNCTION trg_enqueue_speaker_invite();

-- ------------------------------------------------------------
-- 8.9 event_speakers INSERT → event_speaker
-- speaker_id → speakers tablosu (members değil!)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_enqueue_event_speaker()
RETURNS trigger AS $$
DECLARE
  v_speaker_email varchar;
  v_speaker_name  varchar;
  v_event_name    varchar;
  v_event_date    text;
  v_event_loc     text;
BEGIN
  SELECT s.email, s.full_name
    INTO v_speaker_email, v_speaker_name
    FROM speakers s
   WHERE s.id = NEW.speaker_id;

  SELECT
    e.title,
    to_char(e.start_date, 'DD.MM.YYYY HH24:MI'),
    COALESCE(e.location, 'Belirtilmemiş')
    INTO v_event_name, v_event_date, v_event_loc
    FROM events e
   WHERE e.id = NEW.event_id;

  IF v_speaker_email IS NOT NULL AND v_event_name IS NOT NULL THEN
    PERFORM enqueue_email(
      v_speaker_email,
      v_speaker_name,
      'event_speaker',
      jsonb_build_object(
        'speaker_name',   COALESCE(v_speaker_name, 'Konuşmacı'),
        'event_name',     v_event_name,
        'event_date',     COALESCE(v_event_date, 'Belirtilmemiş'),
        'event_location', v_event_loc
      ),
      'high'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_enqueue_event_speaker ON event_speakers;
CREATE TRIGGER tr_enqueue_event_speaker
AFTER INSERT ON event_speakers
FOR EACH ROW EXECUTE FUNCTION trg_enqueue_event_speaker();

-- ------------------------------------------------------------
-- 8.10 event_staff INSERT → event_staff_member
-- member_id → members tablosu
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_enqueue_event_staff_member()
RETURNS trigger AS $$
DECLARE
  v_email      varchar;
  v_name       varchar;
  v_event_name varchar;
  v_event_date text;
  v_event_loc  text;
BEGIN
  SELECT m.email, m.name
    INTO v_email, v_name
    FROM members m
   WHERE m.id = NEW.member_id
     AND m.is_active = true;

  SELECT
    e.title,
    to_char(e.start_date, 'DD.MM.YYYY HH24:MI'),
    COALESCE(e.location, 'Belirtilmemiş')
    INTO v_event_name, v_event_date, v_event_loc
    FROM events e
   WHERE e.id = NEW.event_id;

  IF v_email IS NOT NULL AND v_event_name IS NOT NULL THEN
    PERFORM enqueue_email(
      v_email, v_name,
      'event_staff_member',
      jsonb_build_object(
        'member_name',    COALESCE(v_name, 'Üye'),
        'event_name',     v_event_name,
        'event_date',     COALESCE(v_event_date, 'Belirtilmemiş'),
        'event_location', v_event_loc
      ),
      'medium'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_enqueue_event_staff_member ON event_staff;
CREATE TRIGGER tr_enqueue_event_staff_member
AFTER INSERT ON event_staff
FOR EACH ROW EXECUTE FUNCTION trg_enqueue_event_staff_member();

-- ------------------------------------------------------------
-- 8.11 announcements INSERT → announcement_general
-- Tüm aktif üyelere gönderilir
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_enqueue_announcement_general()
RETURNS trigger AS $$
DECLARE
  v_member record;
BEGIN
  FOR v_member IN
    SELECT id, email, name
      FROM members
     WHERE email IS NOT NULL
       AND is_active = true
  LOOP
    PERFORM enqueue_email(
      v_member.email,
      v_member.name,
      'announcement_general',
      jsonb_build_object(
        'member_name',              COALESCE(v_member.name, 'Üye'),
        'announcement_title',       COALESCE(NEW.title, 'Yeni Duyuru'),
        'announcement_description', COALESCE(NEW.description, '')
      ),
      'low'
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_enqueue_announcement_general ON announcements;
CREATE TRIGGER tr_enqueue_announcement_general
AFTER INSERT ON announcements
FOR EACH ROW EXECUTE FUNCTION trg_enqueue_announcement_general();

-- ------------------------------------------------------------
-- 8.12 member_announcements INSERT → announcement_member
-- profile_id → members.id
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_enqueue_announcement_member()
RETURNS trigger AS $$
DECLARE
  v_email varchar;
  v_name  varchar;
BEGIN
  SELECT m.email, m.name
    INTO v_email, v_name
    FROM members m
   WHERE m.id = NEW.profile_id
     AND m.is_active = true;

  IF v_email IS NOT NULL THEN
    PERFORM enqueue_email(
      v_email, v_name,
      'announcement_member',
      jsonb_build_object(
        'member_name',        COALESCE(v_name, 'Üye'),
        'announcement_title', COALESCE(NEW.announcement_title, 'Yeni Bildirim'),
        'announcement_body',  COALESCE(NEW.announcement_body, '')
      ),
      'medium'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_enqueue_announcement_member ON member_announcements;
CREATE TRIGGER tr_enqueue_announcement_member
AFTER INSERT ON member_announcements
FOR EACH ROW EXECUTE FUNCTION trg_enqueue_announcement_member();

-- ============================================================
-- 9) Doğum Günü Cron Fonksiyonu
-- Kullanım:
--   SELECT enqueue_birthday_emails();       -- kişisel + takım
--   SELECT enqueue_birthday_emails(true);   -- sadece kişisel
-- ============================================================
CREATE OR REPLACE FUNCTION enqueue_birthday_emails(
  p_personal_only boolean DEFAULT false
)
RETURNS void AS $$
DECLARE
  v_today_day        int;
  v_today_month      int;
  v_year             int;
  v_member           record;
  v_personal_already boolean;
  v_team_sent_count  int;
  v_team_recipient   uuid;
  v_team_email       varchar;
  v_team_name        varchar;
BEGIN
  v_today_day   := EXTRACT(day   FROM current_date)::int;
  v_today_month := EXTRACT(month FROM current_date)::int;
  v_year        := EXTRACT(year  FROM current_date)::int;

  FOR v_member IN
    SELECT id, name, email
      FROM members
     WHERE birth_day   = v_today_day
       AND birth_month = v_today_month
       AND email       IS NOT NULL
       AND is_active   = true
  LOOP

    -- Idempotency satırını oluştur (yoksa)
    INSERT INTO birthday_notifications
      (birthday_person_id, notification_year, personal_mail_sent, team_mails_sent_count, sent_at)
    VALUES
      (v_member.id, v_year, false, 0, timezone('utc', now()))
    ON CONFLICT (birthday_person_id, notification_year) DO NOTHING;

    -- ── Kişisel mail ────────────────────────────────────────
    SELECT personal_mail_sent
      INTO v_personal_already
      FROM birthday_notifications
     WHERE birthday_person_id = v_member.id
       AND notification_year  = v_year;

    IF v_personal_already IS DISTINCT FROM true THEN
      PERFORM enqueue_email(
        v_member.email,
        v_member.name,
        'birthday_personal',
        jsonb_build_object(
          'member_name', COALESCE(v_member.name, 'Üye')
        ),
        'high'
      );

      UPDATE birthday_notifications
         SET personal_mail_sent = true,
             sent_at = timezone('utc', now())
       WHERE birthday_person_id = v_member.id
         AND notification_year  = v_year;
    END IF;

    IF p_personal_only THEN
      CONTINUE;
    END IF;

    -- ── Takım mailleri ──────────────────────────────────────
    SELECT team_mails_sent_count
      INTO v_team_sent_count
      FROM birthday_notifications
     WHERE birthday_person_id = v_member.id
       AND notification_year  = v_year;

    IF v_team_sent_count = 0 THEN

      FOR v_team_recipient IN
        SELECT DISTINCT user_id AS recipient_user_id
          FROM (
            SELECT oam.user_id
              FROM org_area_members oam
              JOIN org_area_members b
                ON b.area_id = oam.area_id
             WHERE b.user_id = v_member.id
            UNION
            SELECT odm.user_id
              FROM org_department_members odm
              JOIN org_department_members b
                ON b.department_id = odm.department_id
             WHERE b.user_id = v_member.id
            UNION
            SELECT opm.user_id
              FROM org_project_members opm
              JOIN org_project_members b
                ON b.project_id = opm.project_id
             WHERE b.user_id = v_member.id
          ) t
         WHERE t.user_id IS NOT NULL
           AND t.user_id <> v_member.id
      LOOP
        SELECT m.email, m.name
          INTO v_team_email, v_team_name
          FROM members m
         WHERE m.id       = v_team_recipient
           AND m.is_active = true
         LIMIT 1;

        IF v_team_email IS NOT NULL THEN
          PERFORM enqueue_email(
            v_team_email,
            v_team_name,
            'birthday_team',
            jsonb_build_object(
              'birthday_person', COALESCE(v_member.name, 'Bir Ekip Üyesi')
            ),
            'medium'
          );
        END IF;
      END LOOP;

      UPDATE birthday_notifications
         SET team_mails_sent_count = (
               SELECT COUNT(DISTINCT user_id)
                 FROM (
                   SELECT oam.user_id
                     FROM org_area_members oam
                     JOIN org_area_members b
                       ON b.area_id = oam.area_id
                      AND b.user_id = v_member.id
                   UNION
                   SELECT odm.user_id
                     FROM org_department_members odm
                     JOIN org_department_members b
                       ON b.department_id = odm.department_id
                      AND b.user_id = v_member.id
                   UNION
                   SELECT opm.user_id
                     FROM org_project_members opm
                     JOIN org_project_members b
                       ON b.project_id = opm.project_id
                      AND b.user_id = v_member.id
                 ) t
                WHERE user_id <> v_member.id
             ),
             sent_at = timezone('utc', now())
       WHERE birthday_person_id = v_member.id
         AND notification_year  = v_year;

    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- END OF EMAIL SYSTEM SCRIPT
-- ============================================================