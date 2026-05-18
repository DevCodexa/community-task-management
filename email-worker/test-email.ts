import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

async function testEmailSystem() {
  console.log('📧 Testing Email System...\n');

  // 1. Settings'i kontrol et
  console.log('1️⃣ Checking email settings...');
  const { data: settings, error: settingsError } = await supabase
    .from('email_settings')
    .select('*');

  if (settingsError) {
    console.error('❌ Error fetching settings:', settingsError);
    return;
  }

  console.log('✅ Settings OK:', settings);

  // 2. Templates'i kontrol et
  console.log('\n2️⃣ Checking email templates...');
  const { data: templates, error: templatesError } = await supabase
    .from('email_templates')
    .select('*');

  if (templatesError) {
    console.error('❌ Error fetching templates:', templatesError);
    return;
  }

  console.log(`✅ Templates OK: ${templates.length} templates found`);

  // 3. Test mail kuyruğa ekle
  console.log('\n3️⃣ Enqueueing test email...');
  const { data: queueItem, error: enqueueError } = await supabase
    .from('email_queue')
    .insert([
      {
        recipient_email: 'test@example.com',  // ⚠️ Kendi emailini kullan
        recipient_name: 'Test User',
        template_code: 'welcome_member',
        template_params: {
          member_name: 'Test User',
          join_date: new Date().toISOString().split('T')[0]
        },
        priority: 'high',
        status: 'pending'
      }
    ])
    .select();

  if (enqueueError) {
    console.error('❌ Error enqueueing email:', enqueueError);
    return;
  }

  console.log('✅ Email enqueued:', queueItem);

  // 4. Kuyrukta var mı?
  console.log('\n4️⃣ Checking email queue...');
  const { data: queue, error: queueError } = await supabase
    .from('email_queue')
    .select('*')
    .eq('status', 'pending');

  if (queueError) {
    console.error('❌ Error fetching queue:', queueError);
    return;
  }

  console.log(`✅ Queue OK: ${queue.length} pending emails`);

  // 5. Worker kodunu çalıştır (ClaudeBlackbox'un kodu)
  console.log('\n5️⃣ Running Brevo worker...');
  // ClaudeBlackbox'un worker kodunu buraya koy ve çalıştır
}

testEmailSystem().catch(console.error);