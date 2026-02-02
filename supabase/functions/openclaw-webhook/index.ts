import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface PayoutRequestData {
  gala_id: string;
  gala_username?: string;
  recipient_name: string;
  amount: number;
  reference_number: string;
  receipt_image_url: string;
  country: string;
  country_dial_code: string;
  payout_method: string;
  phone_number: string;
  method_fields?: Record<string, string>;
  agency_code?: string;
}

interface InstantPayoutData {
  supporter_name: string;
  supporter_account_id: string;
  supporter_amount_usd: number;
  supporter_receipt_url: string;
  supporter_receipt_reference?: string;
  supporter_payment_method?: string;
  host_name: string;
  host_account_id: string;
  host_coins_amount: number;
  host_payout_amount: number;
  host_receipt_url: string;
  host_receipt_reference: string;
  host_country: string;
  host_country_dial_code: string;
  host_payout_method: string;
  host_phone_number: string;
  host_recipient_full_name: string;
  host_method_fields?: Record<string, string>;
}

interface BanReportData {
  reporter_gala_id: string;
  reported_user_id: string;
  ban_type: 'promotion' | 'insult' | 'defamation';
  evidence_url: string;
  evidence_type: 'image' | 'video';
  description?: string;
}

interface SpecialIdData {
  gala_user_id: string;
  gala_username?: string;
  user_level: number;
  digit_length: number;
  pattern_code: string;
  preferred_exact_id?: string;
  profile_screenshot_url: string;
}

interface CoinsPayoutData {
  gala_account_id: string;
  gala_username?: string;
  coins_amount: number;
  amount_usd: number;
  reference_number: string;
  receipt_image_url: string;
}

interface WebhookPayload {
  service_type: 'payout' | 'instant' | 'ban_report' | 'special_id' | 'coins';
  conversation_id?: string;
  data: PayoutRequestData | InstantPayoutData | BanReportData | SpecialIdData | CoinsPayoutData;
}

// Generate tracking code
function generateTrackingCode(prefix: string): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}-${code}`;
}

// Send Telegram notification
async function sendTelegramNotification(message: string): Promise<void> {
  const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
  const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID');

  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.log('Telegram credentials not configured');
    return;
  }

  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'Markdown',
      }),
    });
  } catch (error) {
    console.error('Error sending Telegram notification:', error);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: WebhookPayload = await req.json();
    const { service_type, data, conversation_id } = payload;

    console.log(`Received ${service_type} request from OpenClaw bot`, { conversation_id });

    let result: { success: boolean; tracking_code?: string; error?: string };

    switch (service_type) {
      case 'payout': {
        const payoutData = data as PayoutRequestData;
        
        // Check if reference number is already used
        const { data: existingRef } = await supabase
          .rpc('is_reference_used', { ref_number: payoutData.reference_number });
        
        if (existingRef) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'الرقم المرجعي مستخدم مسبقاً. يرجى التأكد من صحة الإيصال.' 
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Check if account already submitted this month
        const currentMonth = new Date();
        const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
        const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0, 23, 59, 59);

        const { data: existingRequest } = await supabase
          .from('payout_requests')
          .select('id')
          .eq('zalal_life_account_id', payoutData.gala_id)
          .gte('created_at', startOfMonth.toISOString())
          .lte('created_at', endOfMonth.toISOString())
          .is('deleted_at', null)
          .maybeSingle();

        if (existingRequest) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: '⚠️ لقد قمت بتقديم طلب سحب هذا الشهر بالفعل. يُسمح بطلب واحد فقط شهرياً لكل حساب.' 
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const trackingCode = generateTrackingCode('PAY');

        const { error: insertError } = await supabase
          .from('payout_requests')
          .insert({
            tracking_code: trackingCode,
            zalal_life_account_id: payoutData.gala_id,
            zalal_life_username: payoutData.gala_username,
            recipient_full_name: payoutData.recipient_name,
            amount: payoutData.amount,
            reference_number: payoutData.reference_number,
            user_receipt_image_url: payoutData.receipt_image_url,
            country: payoutData.country,
            country_dial_code: payoutData.country_dial_code,
            payout_method: payoutData.payout_method,
            phone_number: payoutData.phone_number,
            method_fields: payoutData.method_fields || {},
            agency_code: payoutData.agency_code,
            status: 'pending',
            ai_receipt_status: 'verified_by_bot',
            ai_notes: 'تم التحقق من الإيصال بواسطة بوت OpenClaw',
          });

        if (insertError) throw insertError;

        await sendTelegramNotification(`🆕 *طلب سحب راتب جديد*

📋 كود التتبع: \`${trackingCode}\`
👤 ايدي غلا: ${payoutData.gala_id}
💰 المبلغ: $${payoutData.amount}
🔢 الرقم المرجعي: ${payoutData.reference_number}
🌍 الدولة: ${payoutData.country}
📱 المحفظة: ${payoutData.payout_method}

⏳ *الحالة: قيد الانتظار*
_مصدر: بوت OpenClaw_`);

        result = { success: true, tracking_code: trackingCode };
        break;
      }

      case 'instant': {
        const instantData = data as InstantPayoutData;
        
        // Check host reference number
        const { data: existingRef } = await supabase
          .rpc('is_reference_used', { ref_number: instantData.host_receipt_reference });
        
        if (existingRef) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'الرقم المرجعي لإيصال المضيفة مستخدم مسبقاً.' 
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const trackingCode = generateTrackingCode('INS');

        const { error: insertError } = await supabase
          .from('instant_payout_requests')
          .insert({
            tracking_code: trackingCode,
            supporter_name: instantData.supporter_name,
            supporter_account_id: instantData.supporter_account_id,
            supporter_amount_usd: instantData.supporter_amount_usd,
            supporter_receipt_url: instantData.supporter_receipt_url,
            supporter_receipt_reference: instantData.supporter_receipt_reference,
            supporter_payment_method: instantData.supporter_payment_method,
            host_name: instantData.host_name,
            host_account_id: instantData.host_account_id,
            host_coins_amount: instantData.host_coins_amount,
            host_payout_amount: instantData.host_payout_amount,
            host_receipt_url: instantData.host_receipt_url,
            host_receipt_reference: instantData.host_receipt_reference,
            host_country: instantData.host_country,
            host_country_dial_code: instantData.host_country_dial_code,
            host_payout_method: instantData.host_payout_method,
            host_phone_number: instantData.host_phone_number,
            host_recipient_full_name: instantData.host_recipient_full_name,
            host_method_fields: instantData.host_method_fields || {},
            status: 'pending',
            ai_host_receipt_status: 'verified_by_bot',
            ai_supporter_receipt_status: 'verified_by_bot',
            ai_notes: 'تم التحقق من الإيصالات بواسطة بوت OpenClaw',
          });

        if (insertError) throw insertError;

        await sendTelegramNotification(`🚀 *طلب سحب فوري جديد*

📋 كود التتبع: \`${trackingCode}\`

👤 *الداعم:*
• الاسم: ${instantData.supporter_name}
• الايدي: ${instantData.supporter_account_id}
• المبلغ: $${instantData.supporter_amount_usd}

🎤 *المضيفة:*
• الاسم: ${instantData.host_name}
• الايدي: ${instantData.host_account_id}
• الكوينز: ${instantData.host_coins_amount.toLocaleString()} 🪙
• الصرف: ${instantData.host_payout_amount} ${instantData.host_country === 'SA' ? 'ريال' : 'USD'}

⏳ *الحالة: قيد الانتظار*
_مصدر: بوت OpenClaw_`);

        result = { success: true, tracking_code: trackingCode };
        break;
      }

      case 'ban_report': {
        const banData = data as BanReportData;
        const trackingCode = generateTrackingCode('BAN');

        // We'll store tracking code in admin_notes since there's no tracking_code column
        const { error: insertError } = await supabase
          .from('ban_reports')
          .insert({
            reporter_gala_id: banData.reporter_gala_id,
            reported_user_id: banData.reported_user_id,
            ban_type: banData.ban_type,
            evidence_url: banData.evidence_url,
            evidence_type: banData.evidence_type,
            description: banData.description,
            admin_notes: `كود التتبع: ${trackingCode} | مصدر: بوت OpenClaw`,
          });

        if (insertError) throw insertError;

        const banTypeArabic = {
          promotion: 'ترويج',
          insult: 'إهانة',
          defamation: 'تشهير',
        };

        await sendTelegramNotification(`🚨 *بلاغ مخالفة جديد*

📋 كود التتبع: \`${trackingCode}\`
👤 ايدي المُبلِّغ: ${banData.reporter_gala_id}
🎯 ايدي المخالف: ${banData.reported_user_id}
⚠️ نوع المخالفة: ${banTypeArabic[banData.ban_type]}
📎 نوع الدليل: ${banData.evidence_type === 'video' ? 'فيديو 🎬' : 'صورة 🖼️'}

⏳ *الحالة: قيد المراجعة*
_مصدر: بوت OpenClaw_`);

        result = { success: true, tracking_code: trackingCode };
        break;
      }

      case 'special_id': {
        const specialIdData = data as SpecialIdData;
        const trackingCode = generateTrackingCode('SID');

        // Check if user already has a pending request
        const { data: existingRequest } = await supabase
          .from('special_id_requests')
          .select('id')
          .eq('gala_user_id', specialIdData.gala_user_id)
          .eq('status', 'pending')
          .is('deleted_at', null)
          .maybeSingle();

        if (existingRequest) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'لديك طلب ايدي مميز قيد المراجعة بالفعل. انتظر حتى تتم معالجته.' 
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // We'll store tracking code in admin_notes since there's no tracking_code column
        const { error: insertError } = await supabase
          .from('special_id_requests')
          .insert({
            gala_user_id: specialIdData.gala_user_id,
            gala_username: specialIdData.gala_username,
            user_level: specialIdData.user_level,
            digit_length: specialIdData.digit_length,
            pattern_code: specialIdData.pattern_code,
            preferred_exact_id: specialIdData.preferred_exact_id,
            profile_screenshot_url: specialIdData.profile_screenshot_url,
            status: 'pending',
            ai_verification_status: 'verified_by_bot',
            ai_verified_level: specialIdData.user_level,
            ai_notes: `كود التتبع: ${trackingCode} | تم التحقق من المستوى بواسطة بوت OpenClaw`,
          });

        if (insertError) throw insertError;

        const digitLengthArabic: Record<number, string> = {
          4: '4 أرقام',
          5: '5 أرقام',
          6: '6 أرقام',
          7: '7 أرقام',
        };

        await sendTelegramNotification(`⭐ *طلب ايدي مميز جديد*

📋 كود التتبع: \`${trackingCode}\`
👤 ايدي غلا: ${specialIdData.gala_user_id}
📊 المستوى: ${specialIdData.user_level}
🔢 عدد الأرقام: ${digitLengthArabic[specialIdData.digit_length] || specialIdData.digit_length}
🎨 النمط: ${specialIdData.pattern_code}
${specialIdData.preferred_exact_id ? `✨ الايدي المفضل: ${specialIdData.preferred_exact_id}` : ''}

⏳ *الحالة: قيد المراجعة*
_مصدر: بوت OpenClaw_`);

        result = { success: true, tracking_code: trackingCode };
        break;
      }

      case 'coins': {
        const coinsData = data as CoinsPayoutData;
        
        // Check if reference number is already used in coins table
        const { data: existingRef } = await supabase
          .from('coins_payout_requests')
          .select('id')
          .eq('reference_number', coinsData.reference_number)
          .maybeSingle();
        
        if (existingRef) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'الرقم المرجعي مستخدم مسبقاً في طلبات الكوينز.' 
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const trackingCode = generateTrackingCode('CON');

        const { error: insertError } = await supabase
          .from('coins_payout_requests')
          .insert({
            tracking_code: trackingCode,
            gala_account_id: coinsData.gala_account_id,
            gala_username: coinsData.gala_username,
            coins_amount: coinsData.coins_amount,
            amount_usd: coinsData.amount_usd,
            reference_number: coinsData.reference_number,
            receipt_image_url: coinsData.receipt_image_url,
            status: 'pending',
          });

        if (insertError) throw insertError;

        await sendTelegramNotification(`🪙 *طلب تحويل كوينز جديد*

📋 كود التتبع: \`${trackingCode}\`
👤 ايدي غلا: ${coinsData.gala_account_id}
🪙 الكوينز: ${coinsData.coins_amount.toLocaleString()}
💰 المبلغ: $${coinsData.amount_usd}
🔢 الرقم المرجعي: ${coinsData.reference_number}

⏳ *الحالة: قيد الانتظار*
_مصدر: بوت OpenClaw_`);

        result = { success: true, tracking_code: trackingCode };
        break;
      }

      default:
        return new Response(
          JSON.stringify({ success: false, error: 'نوع الخدمة غير معروف' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in openclaw-webhook:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'حدث خطأ غير متوقع' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
