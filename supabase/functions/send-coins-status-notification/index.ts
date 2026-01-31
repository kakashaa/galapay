import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      tracking_code, 
      gala_account_id, 
      gala_username,
      amount_usd,
      coins_amount,
      status,
      admin_notes 
    } = await req.json();

    const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
    const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID');

    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      throw new Error('Missing Telegram credentials');
    }

    const statusEmoji = status === 'completed' ? '✅' : '❌';
    const statusText = status === 'completed' ? 'تم التسليم' : 'مرفوض';

    const message = `
${statusEmoji} *تحديث طلب كوينزات*

📋 *كود التتبع:* \`${tracking_code}\`
🆔 *ايدي غلا لايف:* ${gala_account_id}
👤 *اليوزر:* ${gala_username || 'غير محدد'}
💵 *المبلغ:* $${amount_usd}
🪙 *الكوينزات:* ${coins_amount.toLocaleString()}

📊 *الحالة:* ${statusText}
${admin_notes ? `📝 *ملاحظات:* ${admin_notes}` : ''}
`.trim();

    const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    
    const response = await fetch(telegramUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'Markdown',
      }),
    });

    const result = await response.json();

    if (!result.ok) {
      console.error('Telegram error:', result);
      throw new Error(`Telegram API error: ${result.description}`);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
