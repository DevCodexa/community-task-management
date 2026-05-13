// deno-lint-ignore-file

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import nodemailer from "npm:nodemailer";

// =========================
// CORS
// =========================

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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

// =========================
// ENV Helper
// =========================

const D: any = globalThis.Deno;

function env(name: string): string {
  return D?.env?.get(name) ?? "";
}

// =========================
// Main Server
// =========================

serve(async (req: Request) => {

  // =========================================
  // CORS PREFLIGHT
  // =========================================

  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {

    // =========================================
    // METHOD CHECK
    // =========================================

    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Method not allowed",
        }),
        {
          status: 405,
          headers: corsHeaders,
        }
      );
    }

    // =========================================
    // BODY PARSE
    // =========================================

    let body: Payload;

    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid JSON body",
        }),
        {
          status: 400,
          headers: corsHeaders,
        }
      );
    }

    const {
      to,
      subject,
      html,
      fromEmail,
      fromName,
    } = body;

    // =========================================
    // VALIDATION
    // =========================================

    if (!to || !subject || !html) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required fields: to, subject, html",
        }),
        {
          status: 400,
          headers: corsHeaders,
        }
      );
    }

    // =========================================
    // SMTP CONFIG
    // =========================================

    const host =
      env("VITE_BREVO_SMTP_HOST") ||
      env("BREVO_SMTP_HOST");

    const port = Number(
      env("VITE_BREVO_SMTP_PORT") ||
      env("BREVO_SMTP_PORT") ||
      587
    );

    const user =
      env("VITE_BREVO_SMTP_USER") ||
      env("BREVO_SMTP_USER");

    const pass =
      env("VITE_BREVO_SMTP_PASS") ||
      env("BREVO_SMTP_PASS");

    if (!host || !user || !pass) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "SMTP configuration missing",
        }),
        {
          status: 500,
          headers: corsHeaders,
        }
      );
    }

    // =========================================
    // FROM INFO
    // =========================================

    const resolvedFromEmail =
      fromEmail ||
      env("VITE_BREVO_FROM_MAIL") ||
      env("BREVO_FROM_EMAIL") ||
      user;

    const resolvedFromName =
      fromName ||
      env("VITE_BREVO_FROM_NAME") ||
      env("BREVO_FROM_NAME") ||
      "Luminari Community";

    // =========================================
    // TRANSPORTER
    // =========================================

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },

      // timeout güvenliği
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
    });

    // =========================================
    // SMTP VERIFY
    // =========================================

    await transporter.verify();

    // =========================================
    // SEND MAIL
    // =========================================

    const info = await transporter.sendMail({
      from: `"${resolvedFromName}" <${resolvedFromEmail}>`,
      to,
      subject,
      html,
    });

    // =========================================
    // SUCCESS RESPONSE
    // =========================================

    return new Response(
      JSON.stringify({
        success: true,
        messageId: info.messageId,
      }),
      {
        status: 200,
        headers: corsHeaders,
      }
    );

  } catch (e: any) {

    console.error("BREVO EMAIL ERROR:", e);

    return new Response(
      JSON.stringify({
        success: false,
        error: e?.message || String(e),
      }),
      {
        status: 500,
        headers: corsHeaders,
      }
    );
  }
});