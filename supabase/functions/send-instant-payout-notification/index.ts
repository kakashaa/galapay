import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface InstantPayoutNotificationRequest {
  trackingCode: string;
  supporterName: string;
  supporterAccountId: string;
  supporterAmountUsd: number;
  supporterPaymentMethod: string;
  supporterReceiptUrl: string;
  hostName: string;
  hostAccountId: string;
  hostCoinsAmount: number;
  hostPayoutAmount: number;
  hostReceiptUrl: string;
  hostReferenceNumber: string;
  hostCountry: string;
  hostPhoneNumber: string;
  hostPayoutMethod: string;
  hostRecipientFullName: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const data: InstantPayoutNotificationRequest = await req.json();
    
    const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
    const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID');
    
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      console.log('Telegram credentials not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Telegram not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const message = `⚡ *طلب سحب فوري جديد*

📋 *كود التتبع:* \`${data.trackingCode}\`

👤 *معلومات الداعم:*
• الاسم: ${data.supporterName}
• الايدي: \`${data.supporterAccountId}\`
• المبلغ: $${data.supporterAmountUsd}
• طريقة الدفع: ${data.supporterPaymentMethod}

🎤 *معلومات المضيف:*
• الاسم: ${data.hostName}
• الايدي: \`${data.hostAccountId}\`
• الكوينز: ${data.hostCoinsAmount.toLocaleString()}
• المبلغ للتحويل: $${data.hostPayoutAmount}
• الرقم المرجعي: \`${data.hostReferenceNumber}\`

💸 *تفاصيل التحويل:*
• البلد: ${data.hostCountry}
• الهاتف: ${data.hostPhoneNumber}
• الطريقة: ${data.hostPayoutMethod}
• اسم المستلم: ${data.hostRecipientFullName}`;

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

    // Send supporter receipt
    if (data.supporterReceiptUrl) {
      try {
        console.log('Downloading supporter receipt from:', data.supporterReceiptUrl);
        const imageResponse = await fetch(data.supporterReceiptUrl);
        if (imageResponse.ok) {
          const imageBlob = await imageResponse.blob();
          const formData = new FormData();
          formData.append('chat_id', TELEGRAM_CHAT_ID);
          formData.append('photo', imageBlob, 'supporter-receipt.jpg');
          formData.append('caption', `📷 إيصال الداعم - ${data.supporterName}`);
          
          const uploadResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, {
            method: 'POST',
            body: formData,
          });
          const photoResult = await uploadResponse.json();
          console.log('Telegram supporter photo response:', photoResult);
        }
      } catch (photoError) {
        console.error('Failed to send supporter photo:', photoError);
      }
    }

    // Send host receipt
    if (data.hostReceiptUrl) {
      try {
        console.log('Downloading host receipt from:', data.hostReceiptUrl);
        const imageResponse = await fetch(data.hostReceiptUrl);
        if (imageResponse.ok) {
          const imageBlob = await imageResponse.blob();
          const formData = new FormData();
          formData.append('chat_id', TELEGRAM_CHAT_ID);
          formData.append('photo', imageBlob, 'host-receipt.jpg');
          formData.append('caption', `📷 إيصال المضيف - ${data.hostName}\n🔑 المرجع: ${data.hostReferenceNumber}`);
          
          const uploadResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, {
            method: 'POST',
            body: formData,
          });
          const photoResult = await uploadResponse.json();
          console.log('Telegram host photo response:', photoResult);
        }
      } catch (photoError) {
        console.error('Failed to send host photo:', photoError);
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
    console.error('Error in send-instant-payout-notification:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
