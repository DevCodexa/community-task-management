/* ===========================================================
   Resend Email Service - Zincir Atarlı Task Management
   =========================================================== */

/**
 * Resend API wrapper for sending emails
 * Uses VITE_RESEND_API_KEY from environment variables
 * 
 * IMPORTANT: Resend requires either:
 * 1. A verified domain (paid plan)
 * 2. Use the test domain: onboarding@resend.dev
 * 
 * For testing, all emails go to your own registered email in Resend dashboard
 */

// Supabase project URL - değiştir bu URL'yi kendi Supabase project'inle
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://vbokappwelyrvoxnkigp.supabase.co';
const SUPABASE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/resend-email`;

const RESEND_API_KEY = import.meta.env.VITE_RESEND_API_KEY || 're_5zc39HzB_LH3nhRSZo9eAzcEXpQ5qr3Bm';

// Email send response type
export interface ResendResponse {
  success: boolean;
  id?: string;
  error?: string;
}

/**
 * Send an email using Resend API
 * @param to - Recipient email address
 * @param subject - Email subject
* @param html - HTML content of the email
 */
export const sendEmail = async (
  to: string,
  subject: string,
  html: string
): Promise<ResendResponse> => {
  // Debug: Check API key
  console.log('📧 Resend Debug:', {
    apiKeyConfigured: !!RESEND_API_KEY,
    apiKeyValue: RESEND_API_KEY ? `${RESEND_API_KEY.slice(0, 10)}...` : 'NOT SET',
    to,
    subject
  });

  // Check if API key is configured
  if (!RESEND_API_KEY) {
    console.warn('⚠️ RESEND API KEY NOT CONFIGURED!');
    console.warn('Please add VITE_RESEND_API_KEY to your .env file and restart dev server');
    return { success: false, error: 'API key not configured' };
  }

  // Get from address - use Resend's test domain (works without verified domain)
  const fromAddress = import.meta.env.VITE_EMAIL_FROM || 'onboarding@resend.dev';

  console.log('📧 Sending email via Supabase Edge Function...');

  try {
    const response = await fetch(SUPABASE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        from: fromAddress,
        to,
        subject,
        html,
      }),
    });

    const responseData = await response.json();
    
    if (!response.ok) {
      console.error('❌ Edge Function Error:', responseData);
      return { success: false, error: responseData.error || 'Edge function error' };
    }

    console.log('✅ Email sent via Edge Function! ID:', responseData.id);
    return { success: true, id: responseData.id };
  } catch (error) {
    console.error('❌ Edge function error:', error);
    return { success: false, error: String(error) };
  }
};

/**
 * Send task assignment email (wrapper with pre-built template)
 * @param to - Recipient email address  
 * @param memberName - Recipient name
 * @param taskTitle - Task title
 * @param taskDescription - Task description
 * @param taskDeadline - Task deadline (optional)
 * @param taskPoints - Task points
 */
export const sendTaskAssignmentEmail = async (
  to: string,
  memberName: string,
  taskTitle: string,
  taskDescription: string,
  taskDeadline: string | null,
  taskPoints: number
): Promise<ResendResponse> => {
  const html = generateTaskAssignmentEmailHtml(
    memberName,
    taskTitle,
    taskDescription,
    taskDeadline,
    taskPoints
  );

  return sendEmail(
    to,
    `🎯 Yeni Görev: ${taskTitle}`,
    html
  );
};

/**
 * Generate HTML for task assignment email
 * Uses theme colors: Ice Blue (#0D8ABC) and Dark Gray (#1a1a2e)
 */
const generateTaskAssignmentEmailHtml = (
  memberName: string,
  taskTitle: string,
  taskDescription: string,
  taskDeadline: string | null,
  taskPoints: number
): string => {
  const formattedDeadline = taskDeadline
    ? new Date(taskDeadline).toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return `
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Yeni Görev Atandı</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0f0f1a;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0f0f1a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #1a1a2e; border-radius: 16px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 40px; text-align: center; background: linear-gradient(135deg, #0D8ABC 0%, #0a6a8a 100%);">
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">
                🎯 Yeni Görev Atandı
              </h1>
              <p style="margin: 8px 0 0 0; font-size: 14px; color: rgba(255,255,255,0.8);">
                Zincir Atarlı Topluluk
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <!-- Greeting -->
              <p style="margin: 0 0 24px 0; font-size: 16px; color: #e0e0e0;">
                Merhaba <strong style="color: #0D8ABC;">${memberName}</strong> 👋
              </p>
              <p style="margin: 0 0 32px 0; font-size: 15px; color: #a0a0a0; line-height: 1.6;">
                Sana yeni bir görev atandı! Aşağıda görev detaylarını bulabilirsin.
              </p>

              <!-- Task Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #252542; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                <tr>
                  <td>
                    <h2 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 600; color: #ffffff;">
                      ${taskTitle}
                    </h2>
                    ${taskDescription ? `
                    <p style="margin: 0 0 16px 0; font-size: 14px; color: #a0a0a0; line-height: 1.5;">
                      ${taskDescription}
                    </p>
                    ` : ''}
                    
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        ${taskDeadline ? `
                        <td style="padding: 8px 0; border-bottom: 1px solid #3a3a5a;">
                          <span style="font-size: 12px; color: #6a6a8a; text-transform: uppercase; letter-spacing: 0.5px;">Son Tarih</span>
                          <p style="margin: 4px 0 0 0; font-size: 14px; color: #ff6b6b; font-weight: 500;">${formattedDeadline}</p>
                        </td>
                        ` : ''}
                        <td style="padding: 8px 0; ${taskDeadline ? 'border-bottom: 1px solid #3a3a5a;' : ''}">
                          <span style="font-size: 12px; color: #6a6a8a; text-transform: uppercase; letter-spacing: 0.5px;">Puan</span>
                          <p style="margin: 4px 0 0 0; font-size: 14px; color: #ffd93d; font-weight: 600;">⭐ ${taskPoints} puan</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="https://community-tasks.vercel.app" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #0D8ABC 0%, #0a6a8a 100%); color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 600; border-radius: 10px;">
                      Görevi Görüntüle →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; text-align: center; border-top: 1px solid #3a3a5a;">
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #6a6a8a;">
                Bu email otomatik olarak gönderilmiştir. Lütfen bu email'e yanıt vermeyin.
              </p>
              <p style="margin: 0; font-size: 12px; color: #4a4a6a;">
                © ${new Date().getFullYear()} Zincir Atarlı Task Management
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
};

/**
 * Check if Resend is properly configured
 */
export const isResendConfigured = (): boolean => {
  return !!RESEND_API_KEY;
};

/**
 * Get Resend API key (for display purposes - masked)
 */
export const getResendStatus = (): { configured: boolean; keyPrefix: string } => {
  if (!RESEND_API_KEY) {
    return { configured: false, keyPrefix: '' };
  }
  
  // Show last 4 characters
  const masked = RESEND_API_KEY.slice(-4);
  return { configured: true, keyPrefix: `...${masked}` };
};

// ===========================================================
// END OF RESEND SERVICE
// ===========================================================
