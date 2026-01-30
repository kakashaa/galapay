import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type RequestStatus = "pending" | "review" | "paid" | "rejected";

interface ResendRequestBody {
  limit?: number;
  statuses?: RequestStatus[];
}

interface PayoutRequestRow {
  tracking_code: string;
  zalal_life_account_id: string;
  zalal_life_username: string | null;
  recipient_full_name: string;
  amount: number;
  country: string;
  payout_method: string;
  phone_number: string;
  reference_number: string | null;
  method_fields: Record<string, unknown> | null;
  agency_code: string | null;
  user_receipt_image_url: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function extractWalletNumber(methodFields: Record<string, unknown> | null): string {
  if (!methodFields) return "";
  const candidates = [
    methodFields["walletNumber"],
    methodFields["wallet_number"],
    methodFields["رقم_المحفظة"],
  ];

  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c.trim();
  }

  // fallback: first non-empty string value
  for (const v of Object.values(methodFields)) {
    if (typeof v === "string" && v.trim()) return v.trim();
  }

  return "";
}

async function sendTelegram(botToken: string, chatId: string, req: PayoutRequestRow) {
  const walletNumber = extractWalletNumber(req.method_fields);

  const message = `🔔 *طلب صرف جديد*

📋 *تفاصيل الطلب:*
• كود التتبع: \`${req.tracking_code}\`
• ايدي غلا لايف: ${req.zalal_life_account_id}
${req.zalal_life_username ? `• اسم في غلا لايف: ${req.zalal_life_username}` : ""}
${req.agency_code ? `• كود الوكالة: ${req.agency_code}` : ""}
• اسم المستلم: ${req.recipient_full_name}
• المبلغ: $${Number(req.amount)}
• البلد: ${req.country}
• طريقة الصرف: ${req.payout_method}
• رقم الهاتف: ${req.phone_number}
${walletNumber ? `• رقم المحفظة: \`${walletNumber}\`` : ""}
${req.reference_number ? `• الرقم المرجعي: \`${req.reference_number}\`` : ""}

📸 صورة الإيصال مرفقة أدناه`;

  const textResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: "Markdown" }),
  });

  const textJson = await textResponse.json();
  if (!textJson?.ok) {
    throw new Error(`Telegram sendMessage failed: ${JSON.stringify(textJson)}`);
  }

  // Try URL first; if fails, fetch+upload
  let photoJson = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      photo: req.user_receipt_image_url,
      caption: `إيصال: ${req.recipient_full_name} - $${Number(req.amount)}`,
    }),
  }).then((r) => r.json());

  if (!photoJson?.ok && req.user_receipt_image_url) {
    const imageResponse = await fetch(req.user_receipt_image_url);
    if (imageResponse.ok) {
      const imageBlob = await imageResponse.blob();
      const formData = new FormData();
      formData.append("chat_id", chatId);
      formData.append("photo", imageBlob, "receipt.jpg");
      formData.append("caption", `إيصال: ${req.recipient_full_name} - $${Number(req.amount)}`);

      photoJson = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
        method: "POST",
        body: formData,
      }).then((r) => r.json());
    }
  }

  // photo may fail, but text already sent; don't hard-fail for that
  return { photoSent: Boolean(photoJson?.ok) };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only super_admin can resend in bulk
    const { data: roleData } = await userClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "super_admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const TELEGRAM_CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID");

    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      return new Response(JSON.stringify({ error: "Telegram not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: ResendRequestBody = await req.json().catch(() => ({}));
    const limit = Math.min(Math.max(body.limit ?? 23, 1), 100);
    const statuses: RequestStatus[] = (body.statuses && body.statuses.length > 0)
      ? body.statuses
      : ["pending", "review"];

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const { data: requests, error: reqError } = await adminClient
      .from("payout_requests")
      .select(
        "tracking_code,zalal_life_account_id,zalal_life_username,recipient_full_name,amount,country,payout_method,phone_number,reference_number,method_fields,agency_code,user_receipt_image_url",
      )
      .in("status", statuses)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (reqError) throw reqError;

    let sent = 0;
    let photoSent = 0;
    const errors: Array<{ tracking_code: string; error: string }> = [];

    for (const r of (requests ?? []) as PayoutRequestRow[]) {
      try {
        const res = await sendTelegram(TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, r);
        sent += 1;
        if (res.photoSent) photoSent += 1;
        await sleep(200);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push({ tracking_code: r.tracking_code, error: msg });
      }
    }

    return new Response(
      JSON.stringify({ success: true, requested: limit, sent, photoSent, errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error in resend-telegram-notifications:", error);
    return new Response(JSON.stringify({ success: false, error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
