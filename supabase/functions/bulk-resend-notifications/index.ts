import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface PayoutRequest {
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

interface InstantRequest {
  tracking_code: string;
  supporter_name: string;
  supporter_account_id: string;
  supporter_amount_usd: number;
  host_name: string;
  host_account_id: string;
  host_payout_amount: number;
  host_currency: string;
  host_country: string;
  host_payout_method: string;
  host_phone_number: string;
  host_recipient_full_name: string;
  supporter_receipt_url: string;
  host_receipt_url: string;
}

interface BanReport {
  id: string;
  reporter_gala_id: string;
  reported_user_id: string;
  ban_type: string;
  description: string | null;
  evidence_url: string;
  evidence_type: string;
}

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
  for (const v of Object.values(methodFields)) {
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

async function sendPayoutNotification(botToken: string, chatId: string, req: PayoutRequest) {
  const walletNumber = extractWalletNumber(req.method_fields);
  const message = `🔔 *طلب صرف شهري*

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
${req.reference_number ? `• الرقم المرجعي: \`${req.reference_number}\`` : ""}`;

  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: "Markdown" }),
  });

  if (req.user_receipt_image_url) {
    try {
      const imageResponse = await fetch(req.user_receipt_image_url);
      if (imageResponse.ok) {
        const imageBlob = await imageResponse.blob();
        const formData = new FormData();
        formData.append("chat_id", chatId);
        formData.append("photo", imageBlob, "receipt.jpg");
        formData.append("caption", `إيصال: ${req.recipient_full_name} - $${Number(req.amount)}`);
        await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, { method: "POST", body: formData });
      }
    } catch (e) {
      console.error("Error sending photo:", e);
    }
  }
}

async function sendInstantNotification(botToken: string, chatId: string, req: InstantRequest) {
  const message = `⚡ *طلب سحب فوري جديد*

📋 *بيانات الداعم:*
• الاسم: ${req.supporter_name}
• ايدي غلا لايف: ${req.supporter_account_id}
• المبلغ المدفوع: $${Number(req.supporter_amount_usd)}

📋 *بيانات المضيف:*
• الاسم: ${req.host_name}
• ايدي غلا لايف: ${req.host_account_id}
• اسم المستلم: ${req.host_recipient_full_name}
• المبلغ: ${Number(req.host_payout_amount)} ${req.host_currency}
• البلد: ${req.host_country}
• طريقة الصرف: ${req.host_payout_method}
• رقم الهاتف: ${req.host_phone_number}

🔗 كود التتبع: \`${req.tracking_code}\``;

  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: "Markdown" }),
  });
}

async function sendBanNotification(botToken: string, chatId: string, report: BanReport) {
  const banTypeArabic: Record<string, string> = {
    promotion: "ترويج لتطبيق آخر",
    insult: "شتم أو إهانة",
    defamation: "تشهير",
  };

  const message = `🚫 *بلاغ تبنيد جديد*

📋 *تفاصيل البلاغ:*
• ايدي المُبلِّغ: ${report.reporter_gala_id}
• ايدي المُبلَّغ عنه: ${report.reported_user_id}
• نوع المخالفة: ${banTypeArabic[report.ban_type] || report.ban_type}
${report.description ? `• الوصف: ${report.description.substring(0, 200)}...` : ""}`;

  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: "Markdown" }),
  });

  if (report.evidence_url) {
    try {
      const evidenceResponse = await fetch(report.evidence_url);
      if (evidenceResponse.ok) {
        const evidenceBlob = await evidenceResponse.blob();
        const formData = new FormData();
        formData.append("chat_id", chatId);
        
        if (report.evidence_type === "video") {
          formData.append("video", evidenceBlob, "evidence.mp4");
          formData.append("caption", `دليل البلاغ - ${report.reporter_gala_id}`);
          await fetch(`https://api.telegram.org/bot${botToken}/sendVideo`, { method: "POST", body: formData });
        } else {
          formData.append("photo", evidenceBlob, "evidence.jpg");
          formData.append("caption", `دليل البلاغ - ${report.reporter_gala_id}`);
          await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, { method: "POST", body: formData });
        }
      }
    } catch (e) {
      console.error("Error sending evidence:", e);
    }
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const TELEGRAM_CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID");

    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      return new Response(JSON.stringify({ error: "Telegram not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const results = {
      payout: { sent: 0, errors: 0 },
      instant: { sent: 0, errors: 0 },
      ban: { sent: 0, errors: 0 },
    };

    // Send payout request notifications
    const { data: payoutRequests } = await adminClient
      .from("payout_requests")
      .select("tracking_code,zalal_life_account_id,zalal_life_username,recipient_full_name,amount,country,payout_method,phone_number,reference_number,method_fields,agency_code,user_receipt_image_url")
      .in("status", ["pending", "review"])
      .order("created_at", { ascending: false })
      .limit(100);

    for (const r of (payoutRequests ?? []) as PayoutRequest[]) {
      try {
        await sendPayoutNotification(TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, r);
        results.payout.sent += 1;
        await sleep(300);
      } catch (e) {
        console.error("Payout notification error:", e);
        results.payout.errors += 1;
      }
    }

    // Send instant payout notifications
    const { data: instantRequests } = await adminClient
      .from("instant_payout_requests")
      .select("tracking_code,supporter_name,supporter_account_id,supporter_amount_usd,host_name,host_account_id,host_payout_amount,host_currency,host_country,host_payout_method,host_phone_number,host_recipient_full_name,supporter_receipt_url,host_receipt_url")
      .in("status", ["pending", "processing"])
      .order("created_at", { ascending: false })
      .limit(50);

    for (const r of (instantRequests ?? []) as InstantRequest[]) {
      try {
        await sendInstantNotification(TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, r);
        results.instant.sent += 1;
        await sleep(300);
      } catch (e) {
        console.error("Instant notification error:", e);
        results.instant.errors += 1;
      }
    }

    // Send ban report notifications
    const { data: banReports } = await adminClient
      .from("ban_reports")
      .select("id,reporter_gala_id,reported_user_id,ban_type,description,evidence_url,evidence_type")
      .eq("is_verified", false)
      .order("created_at", { ascending: false })
      .limit(50);

    for (const r of (banReports ?? []) as BanReport[]) {
      try {
        await sendBanNotification(TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, r);
        results.ban.sent += 1;
        await sleep(300);
      } catch (e) {
        console.error("Ban notification error:", e);
        results.ban.errors += 1;
      }
    }

    const totalSent = results.payout.sent + results.instant.sent + results.ban.sent;

    return new Response(
      JSON.stringify({ 
        success: true, 
        totalSent,
        results,
        message: `تم إرسال ${totalSent} إشعار بنجاح`
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error in bulk-resend-notifications:", error);
    return new Response(JSON.stringify({ success: false, error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
