import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface ReservedNotificationRequest {
  trackingCode: string;
  recipientName: string;
  amount: number;
  reservationReason: string;
  zalalLifeAccountId: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { trackingCode, recipientName, amount, reservationReason, zalalLifeAccountId }: ReservedNotificationRequest = await req.json();
    
    const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
    const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID');
    
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      console.log('Telegram credentials not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Telegram not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const message = `🔒 *تم حجز طلب صرف*

📋 *تفاصيل الطلب:*
• كود التتبع: \`${trackingCode}\`
• ايدي غلا لايف: ${zalalLifeAccountId}
• اسم المستلم: ${recipientName}
• المبلغ: $${amount}

⚠️ *سبب الحجز:*
${reservationReason}`;

    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'Markdown',
      }),
    });

    const result = await response.json();
    console.log('Telegram response:', result);

    if (result.ok) {
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      console.error('Telegram API error:', result);
      return new Response(
        JSON.stringify({ success: false, error: 'Telegram API error' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Error in send-reserved-notification:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
