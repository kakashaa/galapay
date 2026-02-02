import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface EditNotificationRequest {
  trackingCode: string;
  zalalLifeAccountId: string;
  zalalLifeUsername?: string;
  recipientName: string;
  amount: number;
  country: string;
  newPayoutMethod: string;
  previousPayoutMethod?: string;
  newWalletNumber?: string;
  phoneNumber: string;
  newReceiptImageUrl?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const data: EditNotificationRequest = await req.json();
    
    const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
    const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID');
    
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      console.log('Telegram credentials not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Telegram not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const methodChanged = data.previousPayoutMethod && data.previousPayoutMethod !== data.newPayoutMethod;

    const message = `✏️ *تعديل طلب محجوز*

📋 *تفاصيل الطلب:*
• كود التتبع: \`${data.trackingCode}\`
• ايدي غلا لايف: ${data.zalalLifeAccountId}
${data.zalalLifeUsername ? `• اسم في غلا لايف: ${data.zalalLifeUsername}` : ''}
• اسم المستلم: ${data.recipientName}
• المبلغ: $${data.amount}
• البلد: ${data.country}
• رقم الهاتف: ${data.phoneNumber}

📝 *التعديلات:*
${methodChanged ? `• طريقة الصرف: ${data.previousPayoutMethod} ← ${data.newPayoutMethod}` : `• طريقة الصرف: ${data.newPayoutMethod}`}
${data.newWalletNumber ? `• رقم المحفظة الجديد: \`${data.newWalletNumber}\`` : ''}
${data.newReceiptImageUrl ? '• تم رفع إيصال جديد ✅' : ''}

⚠️ *يرجى مراجعة التعديلات*`;

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

    // If there's a new receipt, try to send it
    let photoResult = { ok: false };
    if (data.newReceiptImageUrl) {
      try {
        const imageResponse = await fetch(data.newReceiptImageUrl);
        if (imageResponse.ok) {
          const imageBlob = await imageResponse.blob();
          const formData = new FormData();
          formData.append('chat_id', TELEGRAM_CHAT_ID);
          formData.append('photo', imageBlob, 'edited-receipt.jpg');
          formData.append('caption', `إيصال معدّل: ${data.recipientName} - $${data.amount}`);
          
          const uploadResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, {
            method: 'POST',
            body: formData,
          });
          photoResult = await uploadResponse.json();
          console.log('Telegram photo response:', photoResult);
        }
      } catch (uploadError) {
        console.error('Failed to upload edited receipt:', uploadError);
      }
    }

    if (textResult.ok) {
      return new Response(
        JSON.stringify({ success: true, photoSent: photoResult.ok }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      console.error('Telegram API error:', textResult);
      return new Response(
        JSON.stringify({ success: false, error: 'Telegram API error' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Error in send-reserved-edit-notification:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
