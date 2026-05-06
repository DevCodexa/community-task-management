const s="https://vbokappwelyrvoxnkigp.supabase.co",d=`${s}/functions/v1/resend-email`,i="re_5zc39HzB_LH3nhRSZo9eAzcEXpQ5qr3Bm",p=async(a,o,r)=>{console.log("📧 Resend Debug:",{apiKeyConfigured:!0,apiKeyValue:`${i.slice(0,10)}...`,to:a,subject:o});const t="onboarding@resend.dev";console.log("📧 Sending email via Supabase Edge Function...");try{const e=await fetch(d,{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZib2thcHB3ZWx5cnZveG5raWdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczMDk4NzYsImV4cCI6MjA5Mjg4NTg3Nn0.H1Rhc_d6aYqBVjrGg6Ze0PTDemL70KlvKvMzQdPqzYA"},body:JSON.stringify({from:t,to:a,subject:o,html:r})}),n=await e.json();return e.ok?(console.log("✅ Email sent via Edge Function! ID:",n.id),{success:!0,id:n.id}):(console.error("❌ Edge Function Error:",n),{success:!1,error:n.error||"Edge function error"})}catch(e){return console.error("❌ Edge function error:",e),{success:!1,error:String(e)}}},g=async(a,o,r,t,e,n)=>{const l=c(o,r,t,e,n);return p(a,`🎯 Yeni Görev: ${r}`,l)},c=(a,o,r,t,e)=>{const n=t?new Date(t).toLocaleDateString("tr-TR",{day:"numeric",month:"long",year:"numeric",hour:"2-digit",minute:"2-digit"}):null;return`
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
                Merhaba <strong style="color: #0D8ABC;">${a}</strong> 👋
              </p>
              <p style="margin: 0 0 32px 0; font-size: 15px; color: #a0a0a0; line-height: 1.6;">
                Sana yeni bir görev atandı! Aşağıda görev detaylarını bulabilirsin.
              </p>

              <!-- Task Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #252542; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                <tr>
                  <td>
                    <h2 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 600; color: #ffffff;">
                      ${o}
                    </h2>
                    ${r?`
                    <p style="margin: 0 0 16px 0; font-size: 14px; color: #a0a0a0; line-height: 1.5;">
                      ${r}
                    </p>
                    `:""}
                    
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        ${t?`
                        <td style="padding: 8px 0; border-bottom: 1px solid #3a3a5a;">
                          <span style="font-size: 12px; color: #6a6a8a; text-transform: uppercase; letter-spacing: 0.5px;">Son Tarih</span>
                          <p style="margin: 4px 0 0 0; font-size: 14px; color: #ff6b6b; font-weight: 500;">${n}</p>
                        </td>
                        `:""}
                        <td style="padding: 8px 0; ${t?"border-bottom: 1px solid #3a3a5a;":""}">
                          <span style="font-size: 12px; color: #6a6a8a; text-transform: uppercase; letter-spacing: 0.5px;">Puan</span>
                          <p style="margin: 4px 0 0 0; font-size: 14px; color: #ffd93d; font-weight: 600;">⭐ ${e} puan</p>
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
  `.trim()},f=()=>!0,m=()=>({configured:!0,keyPrefix:`...${i.slice(-4)}`});export{m as getResendStatus,f as isResendConfigured,p as sendEmail,g as sendTaskAssignmentEmail};
