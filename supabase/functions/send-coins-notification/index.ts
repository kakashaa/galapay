import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface CoinsNotificationRequest {
  trackingCode: string;
  galaAccountId: string;
  galaUsername?: string;
  amountUsd: number;
  coinsAmount: number;
  referenceNumber: string;
  receiptImageUrl: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const data: CoinsNotificationRequest = await req.json();
    
    const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
    const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID');
    
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      console.log('Telegram credentials not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Telegram not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const message = `🪙 *طلب كوينزات جديد*

📋 *تفاصيل الطلب:*
• كود التتبع: \`${data.trackingCode}\`
• ايدي غلا لايف: ${data.galaAccountId}
${data.galaUsername ? `• اسم في غلا لايف: ${data.galaUsername}` : ''}
• المبلغ: $${data.amountUsd}
• الكوينزات: ${data.coinsAmount.toLocaleString()} كوينز
• الرقم المرجعي: \`${data.referenceNumber}\`

⚠️ *ملاحظة:* هذا الطلب تحول من راتب شهري إلى كوينزات بسبب استخدام إيصال محظور

📸 صورة الإيصال مرفقة أدناه`;

    // Send text message
    const textResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'Markdown',
      }),
    });

    const textResult = await textResponse.json();
    console.log('Telegram text response:', textResult);

    // Send receipt image
    if (data.receiptImageUrl) {
      try {
        console.log('Downloading receipt from:', data.receiptImageUrl);
        const imageResponse = await fetch(data.receiptImageUrl);
        if (imageResponse.ok) {
          const imageBlob = await imageResponse.blob();
          const formData = new FormData();
          formData.append('chat_id', TELEGRAM_CHAT_ID);
          formData.append('photo', imageBlob, 'receipt.jpg');
          formData.append('caption', `🪙 إيصال كوينزات - ${data.galaAccountId} - $${data.amountUsd}`);
          
          const uploadResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, {
            method: 'POST',
            body: formData,
          });
          const photoResult = await uploadResponse.json();
          console.log('Telegram photo response:', photoResult);
        }
      } catch (photoError) {
        console.error('Failed to send receipt photo:', photoError);
      }
    }

    if (textResult.ok) {
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(
        JSON.stringify({ success: false, error: 'Telegram API error' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Error in send-coins-notification:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
