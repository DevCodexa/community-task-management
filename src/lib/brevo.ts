const SUPABASE_FUNCTION_URL =
  "https://vbokappwelyrvoxnkigp.supabase.co/functions/v1/send-email";

export async function sendMail(to: string, subject: string, html: string) {
  const res = await fetch(SUPABASE_FUNCTION_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ to, subject, html }),
  });

  return await res.json();
}