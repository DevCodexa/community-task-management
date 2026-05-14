export type BrevoResponse = {
  success: boolean;
  error?: string;
};

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://vbokappwelyrvoxnkigp.supabase.co';
const SUPABASE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/brevo-email`; // TODO: function silindiyse bu URL'yi yeni endpoint'e çek

const DEFAULT_FROM_EMAIL = 'aadc70001@smtp-brevo.com';
const DEFAULT_FROM_NAME = 'WolfTeam';

async function sendViaBrevo(to: string, subject: string, html: string): Promise<BrevoResponse> {
  // Debug: hangi backend'i çağırıyoruz?
  console.log('🧪 sendViaBrevo() called - target URL:', SUPABASE_FUNCTION_URL);
  const requestStartedAt = new Date().toISOString();
  try {
    // Edge function hit olmuyor ise bunu anlamak için en baştan log
    console.log('📨 brevo-email request start', {
      to,
      subject,
      supabaseFunctionUrl: SUPABASE_FUNCTION_URL,
      requestStartedAt,
    });

console.log('🔑 sendViaBrevo(): using default API payload (will call edge function)');

    const res = await fetch(SUPABASE_FUNCTION_URL, {
      method: 'POST',
      headers: {
       'Content-Type': 'application/json',
      },
        // Supabase edge functions için gerekli auth header
      //headers: {
        //'Content-Type': 'application/json',
        // Supabase edge functions için gerekli auth header
        // (CORS preflight'da “ok olmayan” yanıtın asıl sebebi genelde authorization/route değil, env/edge function config olabilir)
        //Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      //},
      body: JSON.stringify({
        to,
        subject,
        html,
        fromEmail: DEFAULT_FROM_EMAIL,
        fromName: DEFAULT_FROM_NAME,
      }),
    });

    const responseText = await res.text().catch(() => '');
    let data: any = null;
    if (responseText) {
      data = (() => {
        try {
          return JSON.parse(responseText);
        } catch {
          return null;
        }
      })();
    }

    console.log('📨 brevo-email response', {
      status: res.status,
      ok: res.ok,
      requestStartedAt,
      responseText:
        responseText && responseText.length > 1000
          ? responseText.slice(0, 1000) + '...'
          : responseText,
      responseJson: data,
    });

    if (!res.ok) {
      return { success: false, error: data?.error || data?.message || 'Email send failed' };
    }

    return { success: true };
  } catch (e: any) {
    console.warn('📨 brevo-email request failed (fetch error)', {
      to,
      subject,
      supabaseFunctionUrl: SUPABASE_FUNCTION_URL,
      requestStartedAt,
      error: String(e),
    });
    return { success: false, error: String(e) };
  }
}

function normalizeProfileUrl(profilePath: string): string {
  if (!profilePath) return '/profil';
  if (profilePath.startsWith('http://') || profilePath.startsWith('https://')) return profilePath;
  if (profilePath.startsWith('/')) return profilePath;
  return `/${profilePath}`;
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&#039;');
}

export const sendNewMemberWelcomeEmail = async (
  to: string,
  memberName: string,
  roleTitle: string | null,
  profilePath: string
): Promise<BrevoResponse> => {
  const subject = 'Aramıza Hoş Geldin! ✨ Seninle Tanıştığımız İçin Çok Mutluyuz';

  const safeRole = (roleTitle ?? '').trim();
  const commLine = safeRole
    ? `Topluluğumuzda <strong style="color:#ffffff;">${escapeHtml(safeRole)}</strong> olarak atanman bizi çok heyecanlandırdı! 🎉<br/>Yeni görevin hayırlı olsun! 🙌`
    : `Yeni üygemiz olarak aramıza hoş geldin! ✨`;

  const profileUrl = normalizeProfileUrl(profilePath);

  const html = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Hoş Geldin</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background-color:#0f0f1a;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f0f1a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#1a1a2e;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="padding:28px 40px;text-align:center;background:linear-gradient(135deg,#0D8ABC 0%, #0a6a8a 100%);">
              <h1 style="margin:0;font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">Hoş Geldin! 👋✨</h1>
              <p style="margin:8px 0 0 0;font-size:14px;color:rgba(255,255,255,0.85);">Seninle tanıştığımız için çok mutluyuz</p>
            </td>
          </tr>

          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 18px 0;font-size:16px;color:#e0e0e0;">
                Merhaba <strong style="color:#0D8ABC;">${escapeHtml(memberName)}</strong> 💙
              </p>

              <p style="margin:0 0 22px 0;font-size:15px;color:#a0a0a0;line-height:1.7;">
                ${commLine}
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 10px 0;">
                <tr>
                  <td align="center">
                    <a href="${profileUrl}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#0D8ABC 0%, #0a6a8a 100%);color:#ffffff;text-decoration:none;font-size:15px;font-weight:800;border-radius:10px;">
                      Hadi Başlayalım! →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:18px 0 0 0;font-size:12px;color:#6a6a8a;line-height:1.6;text-align:center;">
                İpucu: Profilini güncelleyip kendini tanıtınca ekibin seni daha hızlı keşfeder 😄
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:22px 40px;text-align:center;border-top:1px solid #3a3a5a;">
              <p style="margin:0 0 8px 0;font-size:12px;color:#6a6a8a;">
                Bu e-posta otomatik olarak gönderildi. Lütfen yanıtlamayın.
              </p>
              <p style="margin:0;font-size:12px;color:#4a4a6a;">© ${new Date().getFullYear()} WolfTeam</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return sendViaBrevo(to, subject, html);
};

export const sendTaskAssignmentEmail = async (
  to: string,
  memberName: string,
  taskTitle: string,
  taskDescription: string,
  taskDeadline: string | null,
  taskPoints: number
): Promise<BrevoResponse> => {
  const subject = `🎯 Yeni Görev: ${taskTitle}`;

  const formattedDeadline = taskDeadline
    ? new Date(taskDeadline).toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  const html = `<!DOCTYPE html>
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
          <tr>
            <td style="padding: 32px 40px; text-align: center; background: linear-gradient(135deg, #0D8ABC 0%, #0a6a8a 100%);">
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">🎯 Yeni Görev Atandı</h1>
              <p style="margin: 8px 0 0 0; font-size: 14px; color: rgba(255,255,255,0.8);">Zincir Atarlı Topluluk</p>
            </td>
          </tr>

          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 24px 0; font-size: 16px; color: #e0e0e0;">Merhaba <strong style="color: #0D8ABC;">${escapeHtml(memberName)}</strong> 👋</p>
              <p style="margin: 0 0 32px 0; font-size: 15px; color: #a0a0a0; line-height: 1.6;">Sana yeni bir görev atandı! Aşağıda görev detaylarını bulabilirsin.</p>

              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #252542; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                <tr>
                  <td>
                    <h2 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 600; color: #ffffff;">${escapeHtml(taskTitle)}</h2>
                    ${taskDescription ? `<p style="margin: 0 0 16px 0; font-size: 14px; color: #a0a0a0; line-height: 1.5;">${taskDescription}</p>` : ''}

                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        ${taskDeadline ? `
                        <td style="padding: 8px 0; border-bottom: 1px solid #3a3a5a;">
                          <span style="font-size: 12px; color: #6a6a8a; text-transform: uppercase; letter-spacing: 0.5px;">Son Tarih</span>
                          <p style="margin: 4px 0 0 0; font-size: 14px; color: #ff6b6b; font-weight: 500;">${formattedDeadline}</p>
                        </td>` : ''}

                        <td style="padding: 8px 0; ${taskDeadline ? 'border-bottom: 1px solid #3a3a5a;' : ''}">
                          <span style="font-size: 12px; color: #6a6a8a; text-transform: uppercase; letter-spacing: 0.5px;">Puan</span>
                          <p style="margin: 4px 0 0 0; font-size: 14px; color: #ffd93d; font-weight: 600;">⭐ ${taskPoints} puan</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="https://community-tasks.vercel.app" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #0D8ABC 0%, #0a6a8a 100%); color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 600; border-radius: 10px;">Görevi Görüntüle →</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding: 24px 40px; text-align: center; border-top: 1px solid #3a3a5a;">
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #6a6a8a;">Bu email otomatik olarak gönderilmiştir. Lütfen bu email'e yanıt vermeyin.</p>
              <p style="margin: 0; font-size: 12px; color: #4a4a6a;">© ${new Date().getFullYear()} Zincir Atarlı Task Management</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return sendViaBrevo(to, subject, html);
};

export const sendEmail = async (to: string, subject: string, html: string): Promise<BrevoResponse> => {
  console.log('📩 Brevo sendEmail called', { to, subject });
  return sendViaBrevo(to, subject, html);
};


