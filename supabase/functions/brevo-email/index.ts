// deno-lint-ignore-file
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import type { Request } from "https://deno.land/std@0.224.0/http/server.ts";

import { corsHeaders } from "../_shared/cors.ts";

import nodemailer from "npm:nodemailer@6.9.14";

// NOTE: Supabase Edge Functions runtime provides `Deno.env`.
// The TypeScript checker used in this repo might not include Deno types,
// so we use `globalThis` typing.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const D: any = (globalThis as any).Deno;

type Payload = {
  to: string;
  subject: string;
  html: string;
  fromEmail?: string;
  fromName?: string;
};

const REQUIRED = [
  "VITE_BREVO_SMTP_HOST",
  "VITE_BREVO_SMTP_PORT",
  "VITE_BREVO_SMTP_USER",
  "VITE_BREVO_SMTP_PASS",
  "BREVO_SMTP_HOST",
  "BREVO_SMTP_PORT",
  "BREVO_SMTP_USER",
  "BREVO_SMTP_PASS",
] as const;


type RequiredKey = (typeof REQUIRED)[number];

type EnvKey = RequiredKey | "VITE_BREVO_FROM_MAIL" | "BREVO_FROM_EMAIL" | "VITE_BREVO_FROM_NAME" | "BREVO_FROM_NAME";

function env(name: EnvKey): string {
  return D?.env?.get(name) ?? "";
}


serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as Payload;
    const { to, subject, html, fromEmail, fromName } = body;

    if (!to || !subject || !html) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: to, subject, html" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const missing = REQUIRED.filter((k) => !env(k));
    if (missing.length > 0) {
      return new Response(
        JSON.stringify({ error: `Missing env vars: ${missing.join(", ")}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const host = env("VITE_BREVO_SMTP_HOST") || env("BREVO_SMTP_HOST");
    const port = Number(env("VITE_BREVO_SMTP_PORT") || env("BREVO_SMTP_PORT"));
    const user = env("VITE_BREVO_SMTP_USER") || env("BREVO_SMTP_USER");
    const pass = env("VITE_BREVO_SMTP_PASS") || env("BREVO_SMTP_PASS");

    const resolvedFromEmail = fromEmail || env("VITE_BREVO_FROM_MAIL") || env("BREVO_FROM_EMAIL") || user;
    const resolvedFromName = fromName || env("VITE_BREVO_FROM_NAME") || env("BREVO_FROM_NAME") || "WolfTeam";


    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: false,
      auth: { user, pass },
    });

    const info = await transporter.sendMail({
      from: `"${resolvedFromName}" <${resolvedFromEmail}>`,
      to,
      subject,
      html,
    });

    return new Response(
      JSON.stringify({ success: true, id: (info as any)?.messageId }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

