import { createClient } from "https://esm.sh/@supabase/supabase-js@2.104.1";
import { corsHeaders } from "../_shared/cors.ts";

type InvitePayload = {
  company_id?: string;
  emails?: string[];
  app_origin?: string;
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !supabaseAnonKey) {
    return json({ error: "Supabase environment is not configured." }, 500);
  }

  const authorization = req.headers.get("Authorization");
  if (!authorization) return json({ error: "Missing Authorization header." }, 401);

  const payload = (await req.json()) as InvitePayload;
  const companyId = payload.company_id;
  const emails = Array.isArray(payload.emails) ? payload.emails : [];

  if (!companyId || emails.length === 0) {
    return json({ error: "company_id and emails are required." }, 400);
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });

  const { data: inviteBatch, error } = await supabase.rpc("create_company_invites", {
    p_company_id: companyId,
    p_emails: emails,
    p_app_origin: payload.app_origin,
  });

  if (error) return json({ error: error.message }, 400);

  const resendKey = Deno.env.get("RESEND_API_KEY");
  const fromEmail = Deno.env.get("INVITE_FROM_EMAIL") || "Nirmit Bharat <invites@nirmitbharat.com>";

  if (!resendKey) {
    return json({
      ...inviteBatch,
      delivery_status: "queued",
      warning: "RESEND_API_KEY is not configured, so emails were not sent.",
    });
  }

  const inviteUrl = inviteBatch.invite_url;
  const companyName = inviteBatch.company_name || "your workspace";
  const results = [];

  for (const email of inviteBatch.emails || []) {
    const url = `${inviteUrl}&email=${encodeURIComponent(email)}`;
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: email,
        subject: `Join ${companyName} on Nirmit Bharat`,
        html: `
          <div style="font-family:Inter,Arial,sans-serif;line-height:1.6;color:#17201b">
            <h2 style="margin:0 0 12px">You're invited to ${companyName}</h2>
            <p>Use the secure link below to join your company's analytics workspace.</p>
            <p><a href="${url}" style="display:inline-block;background:#1F4D3B;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:700">Join workspace</a></p>
            <p style="color:#647067;font-size:13px">This invite expires in 72 hours.</p>
          </div>
        `,
      }),
    });

    results.push({ email, ok: response.ok, status: response.status });
  }

  return json({ ...inviteBatch, delivery_status: "sent", results });
});
