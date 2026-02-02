import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Complete system knowledge base
const SYSTEM_KNOWLEDGE = `
أنت مساعد "الأستاذ" لمنصة غلا باي (GalaPay) - نظام صرف رواتب مضيفات وداعمي تطبيق غلا لايف.

## الخدمات الرئيسية:
1. **صرف الراتب الشهري** - للمضيفات عبر payout_requests
2. **السحب الفوري** - للداعمين عبر instant_payout_requests  
3. **بلاغات التبنيد** - عبر ban_reports
4. **الأيدي المميز** - عبر special_id_requests
5. **شراء الكوينز** - عبر coins_payout_requests

## أوامر المسؤول المتاحة:
- approve: موافقة على طلب
- reject: رفض طلب (يتطلب rejection_reason)
- reserve: حجز طلب لمراجعة لاحقة (يتطلب reservation_reason)
- update_amount: تعديل المبلغ (يتطلب new_amount)
- upload_receipt: رفع إيصال الدفع النهائي (يتطلب image_url)
- create_ban: إنشاء بلاغ بند معتمد
- verify_ban: تأكيد بلاغ بند
- reject_ban: رفض بلاغ بند
- reward: تحديد مكافأة البلاغ (يتطلب reward_amount)
- gift_vip: إهداء VIP (يتطلب gala_user_id)
- gift_special_id: إهداء أيدي مميز (يتطلب gala_user_id و special_id_value)

## قواعد التحقق من الإيصالات:
1. يجب أن يحتوي على رقم مرجعي واضح
2. الرقم المرجعي يجب ألا يكون مستخدم من قبل
3. التاريخ يجب أن يكون حديث (خلال آخر 30 يوم)
4. المبلغ يجب أن يتطابق مع المطلوب
5. لا يُقبل إيصال بايدي وكالة 10000

## قواعد الأيدي المميز:
- المستوى 40+: أيدي من 5 أرقام
- المستوى 50+: أيدي من 4 أرقام  
- المستوى 60+: أيدي من 3 أرقام

## الردود على المستخدمين:
- رد بلطف واحترافية
- استخدم اللغة العربية الفصحى السهلة
- أضف إيموجي مناسبة
- وجه المستخدم للخطوة التالية دائماً

## حالات الطلبات:
- pending: قيد الانتظار
- processing: قيد المعالجة
- review: تحت المراجعة
- paid/completed: تم الدفع
- rejected: مرفوض
- reserved: محجوز

## ⛔ ممنوعات:
- الحذف نهائياً ممنوع عبر البوت
- لا تنفذ أي أمر إلا بطلب صريح من المسؤول
- لا تغير الحالة لـ paid بدون إيصال
`;

// Get real-time data from database
async function getRealtimeContext(supabase: any) {
  const [stats, pendingRequests, countries, banks] = await Promise.all([
    // Stats
    Promise.all([
      supabase.from('payout_requests').select('id', { count: 'exact', head: true }).is('deleted_at', null),
      supabase.from('instant_payout_requests').select('id', { count: 'exact', head: true }).is('deleted_at', null),
      supabase.from('ban_reports').select('id', { count: 'exact', head: true }).is('deleted_at', null),
      supabase.from('special_id_requests').select('id', { count: 'exact', head: true }).is('deleted_at', null),
      supabase.from('coins_payout_requests').select('id', { count: 'exact', head: true }),
    ]),
    // Pending requests
    Promise.all([
      supabase.from('payout_requests').select('tracking_code, zalal_life_account_id, amount, status').eq('status', 'pending').is('deleted_at', null).limit(10),
      supabase.from('instant_payout_requests').select('tracking_code, host_account_id, host_payout_amount, status').eq('status', 'pending').is('deleted_at', null).limit(10),
    ]),
    // Countries
    supabase.from('countries_methods').select('country_name_arabic, country_code, methods').eq('is_active', true),
    // Banks
    supabase.from('available_banks').select('bank_name_arabic, country_name_arabic').eq('is_active', true),
  ]);

  return {
    totalPayouts: stats[0].count || 0,
    totalInstant: stats[1].count || 0,
    totalBans: stats[2].count || 0,
    totalSpecialId: stats[3].count || 0,
    totalCoins: stats[4].count || 0,
    pendingPayouts: pendingRequests[0].data || [],
    pendingInstant: pendingRequests[1].data || [],
    countries: countries.data || [],
    banks: banks.data || [],
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { question, context, request_type } = await req.json();

    if (!question) {
      return new Response(
        JSON.stringify({ error: 'question is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get real-time context
    const realtimeData = await getRealtimeContext(supabase);

    const realtimeContext = `
## البيانات الحية الآن:
- إجمالي طلبات الصرف: ${realtimeData.totalPayouts}
- إجمالي السحب الفوري: ${realtimeData.totalInstant}
- إجمالي البلاغات: ${realtimeData.totalBans}
- إجمالي طلبات الأيدي: ${realtimeData.totalSpecialId}
- إجمالي طلبات الكوينز: ${realtimeData.totalCoins}

## طلبات الصرف المعلقة (أحدث 10):
${realtimeData.pendingPayouts.map((r: any) => `- ${r.tracking_code}: ${r.zalal_life_account_id} - $${r.amount}`).join('\n') || 'لا يوجد'}

## طلبات السحب الفوري المعلقة (أحدث 10):
${realtimeData.pendingInstant.map((r: any) => `- ${r.tracking_code}: ${r.host_account_id} - $${r.host_payout_amount}`).join('\n') || 'لا يوجد'}

## الدول المتاحة:
${realtimeData.countries.map((c: any) => c.country_name_arabic).join('، ') || 'غير محدد'}

## البنوك المتاحة للسحب الفوري:
${realtimeData.banks.map((b: any) => `${b.bank_name_arabic} (${b.country_name_arabic})`).join('، ') || 'غير محدد'}
`;

    // Build the prompt
    const systemPrompt = `${SYSTEM_KNOWLEDGE}\n\n${realtimeContext}

## سياق إضافي من البوت:
${context || 'لا يوجد سياق إضافي'}

## نوع الطلب: ${request_type || 'general'}

## تعليمات الرد:
1. أجب بشكل مباشر ومختصر
2. إذا كان السؤال عن أمر إداري، اشرح كيفية تنفيذه
3. إذا كان عن تحقق، اشرح القواعد المطبقة
4. إذا كان عن مستخدم، اقترح رد احترافي مناسب
5. استخدم البيانات الحية عند الحاجة
6. لا تخترع بيانات غير موجودة`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: question },
        ],
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'rate_limit', message: 'حد الطلبات مؤقتاً، حاول لاحقاً' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'payment_required', message: 'يرجى إضافة رصيد' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error('AI gateway error');
    }

    const aiResponse = await response.json();
    const answer = aiResponse.choices?.[0]?.message?.content?.trim();

    if (!answer) {
      throw new Error('No answer generated');
    }

    // Log the training interaction for improvement
    console.log(`Training Q: ${question.substring(0, 100)}...`);
    console.log(`Training A: ${answer.substring(0, 100)}...`);

    return new Response(
      JSON.stringify({
        success: true,
        answer,
        context_used: {
          total_payouts: realtimeData.totalPayouts,
          total_instant: realtimeData.totalInstant,
          pending_count: realtimeData.pendingPayouts.length + realtimeData.pendingInstant.length,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Training webhook error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        fallback_answer: 'عذراً، حدث خطأ. يرجى المحاولة مرة أخرى أو التواصل مع المسؤول.',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
