// deno-lint-ignore-file
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import nodemailer from "npm:nodemailer@6.9.14";

// Tarayıcıya "Sana cevap verebilirim, güvenliyim" diyen başlıklar
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const D: any = (globalThis as any).Deno;

type Payload = {
  to: string;
  subject: string;
  html: string;
  fromEmail?: string;
  fromName?: string;
};

// Gerekli ortam değişkenlerini sadece bir tanesi (VITE veya Normal) olsa da çalışacak şekilde kontrol edelim
function env(name: string): string {
  return D?.env?.get(name) ?? "";
}

serve(async (req: Request) => {
// 1) CORS preflight: OPTIONS isteğine kesinlikle CORS header ile cevap ver
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // 2) Sadece POST isteklerine izin ver
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as Payload;
    const { to, subject, html, fromEmail, fromName } = body;

    // Alan kontrolü
    if (!to || !subject || !html) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: to, subject, html" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // SMTP Ayarlarını Getir (Yedekli sistem)
    const host = env("VITE_BREVO_SMTP_HOST") || env("BREVO_SMTP_HOST");
    const port = Number(env("VITE_BREVO_SMTP_PORT") || env("BREVO_SMTP_PORT"));
    const user = env("VITE_BREVO_SMTP_USER") || env("BREVO_SMTP_USER");
    const pass = env("VITE_BREVO_SMTP_PASS") || env("BREVO_SMTP_PASS");

    if (!host || !user || !pass) {
      throw new Error("SMTP configuration is missing in environment variables.");
    }

    const resolvedFromEmail = fromEmail || env("VITE_BREVO_FROM_MAIL") || env("BREVO_FROM_EMAIL") || user;
    const resolvedFromName = fromName || env("VITE_BREVO_FROM_NAME") || env("BREVO_FROM_NAME") || "Luminari Community";

    // Nodemailer Kurulumu
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // 465 ise true, 587 ise false
      auth: { user, pass },
    });

    // Maili Gönder
    const info = await transporter.sendMail({
      from: `"${resolvedFromName}" <${resolvedFromEmail}>`,
      to,
      subject,
      html,
    });

    // Başarılı Yanıt (CORS headerları dahil)
    return new Response(
      JSON.stringify({ success: true, id: (info as any)?.messageId }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );

  } catch (e: any) {
    console.error("Email Error:", e.message);
    return new Response(
      JSON.stringify({ error: e.message || String(e) }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      },
    );
  }
});