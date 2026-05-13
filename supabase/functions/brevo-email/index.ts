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

// =========================
// ENV Helper
// =========================

function env(name: string): string {
  return Deno.env.get(name) ?? "";
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

    // =========================
    // BODY
    // =========================

    const body: Payload = await req.json();

    const {
      to,
      subject,
      html,
      fromEmail,
      fromName,
    } = body;

    // =========================
    // VALIDATION
    // =========================

    if (!to || !subject || !html) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required fields",
        }),
        {
          status: 400,
          headers: corsHeaders,
        }
      );
    }

    // =========================
    // SMTP ENV
    // =========================

    const host = env("BREVO_SMTP_HOST");

    const port = Number(
      env("BREVO_SMTP_PORT") || 587
    );

    const user = env("BREVO_SMTP_USER");

    const pass = env("BREVO_SMTP_PASS");

    if (!host || !user || !pass) {

      console.error("SMTP ENV ERROR", {
        host,
        user,
        passExists: !!pass,
      });

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

    // =========================
    // FROM
    // =========================

    const resolvedFromEmail =
      fromEmail ||
      env("BREVO_FROM_EMAIL") ||
      user;

    const resolvedFromName =
      fromName ||
      env("BREVO_FROM_NAME") ||
      "Luminari Community";

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

    const info = await transporter.sendMail({
      from: `"${resolvedFromName}" <${resolvedFromEmail}>`,
      to,
      subject,
      html,
    });

    // =========================
    // SUCCESS
    // =========================

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

    console.error("BREVO EMAIL ERROR");

    console.error({
      message: e?.message,
      stack: e?.stack,
      name: e?.name,
    });

    return new Response(
      JSON.stringify({
        success: false,
        error: e?.message || "Unknown error",
      }),
      {
        status: 500,
        headers: corsHeaders,
      }
    );
  }
});