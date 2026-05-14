// deno-lint-ignore-file

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import nodemailer from "npm:nodemailer";

// =========================
// CORS
// =========================

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "*",
  "Content-Type": "application/json",
};

// =========================
// Types
// =========================

type Payload = {
  to: string;
  subject: string;
  html: string;
  fromEmail?: string;
  fromName?: string;
};

type ApiResult = {
  success: boolean;
  messageId?: string;
  error?: string;
};

// =========================
// ENV Helper
// =========================

function env(name: string): string {
  return Deno.env.get(name) ?? "";
}

function isNonEmpty(v: string | undefined | null): v is string {
  return !!v && v.trim().length > 0;
}

// =========================
// Main Server
// =========================

serve(async (req: Request) => {
  // =========================
  // OPTIONS / PREFLIGHT
  // =========================

  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // =========================
    // METHOD CHECK
    // =========================

    if (req.method !== "POST") {
      const res: ApiResult = { success: false, error: "Method not allowed" };
      return new Response(JSON.stringify(res), {
        status: 405,
        headers: corsHeaders,
      });
    }

    // =========================
    // BODY
    // =========================

    const body: Payload = await req.json();

    const { to, subject, html, fromEmail, fromName } = body;

    // =========================
    // VALIDATION
    // =========================

    if (!to || !subject || !html) {
      const res: ApiResult = { success: false, error: "Missing required fields" };
      return new Response(JSON.stringify(res), {
        status: 400,
        headers: corsHeaders,
      });
    }

    // =========================
    // API KEY PRIORITY
    // =========================

    const brevoApiKey = env("BREVO_API_KEY");

    if (isNonEmpty(brevoApiKey)) {
      const endpoint = "https://api.brevo.com/v3/smtp/email";

      const resolvedFromEmail =
        fromEmail || env("BREVO_SMTP_USER") || env("BREVO_FROM_EMAIL");

      const resolvedFromName =
        fromName || env("BREVO_FROM_NAME") || "Wolf Team Community";

      // Brevo v3 transactional request body
      const brevoBody = {
        to: [{ email: to }],
        subject,
        html,
        sender: {
          email: resolvedFromEmail,
          name: resolvedFromName,
        },
      };

      // basic validation for sender when using API
      if (!isNonEmpty(resolvedFromEmail)) {
        const res: ApiResult = {
          success: false,
          error: "BREVO_API_KEY mode requires a sender email (set fromEmail or BREVO_SMTP_USER/BREVO_FROM_EMAIL)",
        };
        return new Response(JSON.stringify(res), {
          status: 500,
          headers: corsHeaders,
        });
      }

      console.info("BREVO EMAIL: using HTTP API", {
        endpoint,
        hasApiKey: true,
        to,
        subject,
      });

      const controller = new AbortController();
      const timeoutMs = 20000;
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const apiResp = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "api-key": brevoApiKey,
          },
          body: JSON.stringify(brevoBody),
          signal: controller.signal,
        });

        const respText = await apiResp.text();
        let respJson: any = null;
        try {
          respJson = respText ? JSON.parse(respText) : null;
        } catch {
          // ignore parse errors; keep respText
        }

        if (!apiResp.ok) {
          console.error("BREVO HTTP API ERROR", {
            status: apiResp.status,
            statusText: apiResp.statusText,
            responseText: respText,
            responseJson: respJson,
          });

          const res: ApiResult = {
            success: false,
            error: `Brevo API error (${apiResp.status})`,
          };

          return new Response(JSON.stringify(res), {
            status: 500,
            headers: corsHeaders,
          });
        }

        // Brevo returns message details; messageId may be present in some responses
        const messageId =
          respJson?.messageId ||
          respJson?.message_id ||
          respJson?.id ||
          respJson?.message?.id;

        const res: ApiResult = { success: true, messageId };
        return new Response(JSON.stringify(res), {
          status: 200,
          headers: corsHeaders,
        });
      } finally {
        clearTimeout(timeoutId);
      }
    }

    // =========================
    // SMTP ENV (fallback)
    // =========================

    const host = env("BREVO_SMTP_HOST");
    const port = Number(env("BREVO_SMTP_PORT") || 587);
    const user = env("BREVO_SMTP_USER");
    const pass = env("BREVO_SMTP_PASS");

    if (!host || !user || !pass) {
      console.error("SMTP ENV ERROR", {
        host,
        userPresent: isNonEmpty(user),
        passExists: !!pass,
      });

      const res: ApiResult = {
        success: false,
        error: "SMTP configuration missing",
      };
      return new Response(JSON.stringify(res), {
        status: 500,
        headers: corsHeaders,
      });
    }

    // =========================
    // FROM
    // =========================

    const resolvedFromEmail =
      fromEmail || env("BREVO_FROM_EMAIL") || user;

    const resolvedFromName =
      fromName || env("BREVO_FROM_NAME") || "Wolf Team Community";

    // =========================
    // NODEMAILER
    // =========================

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,

      auth: {
        user,
        pass,
      },

      tls: {
        rejectUnauthorized: false,
      },

      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
    });

    // =========================
    // SEND MAIL
    // =========================

    console.info("BREVO EMAIL: using SMTP fallback", {
      host,
      port,
      to,
      subject,
    });

    const info = await transporter.sendMail({
      from: `"${resolvedFromName}" <${resolvedFromEmail}>`,
      to,
      subject,
      html,
    });

    // =========================
    // SUCCESS
    // =========================

    const res: ApiResult = {
      success: true,
      messageId: info?.messageId,
    };

    return new Response(JSON.stringify(res), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (e: any) {
    console.error("BREVO EMAIL ERROR");
    console.error({
      message: e?.message,
      stack: e?.stack,
      name: e?.name,
    });

    const res: ApiResult = {
      success: false,
      error: e?.message || "Unknown error",
    };

    return new Response(JSON.stringify(res), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
