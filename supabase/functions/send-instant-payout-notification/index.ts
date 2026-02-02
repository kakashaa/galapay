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

// Fast photo upload with timeout
async function uploadPhoto(
  botToken: string,
  chatId: string,
  imageUrl: string,
  caption: string
): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const imageResponse = await fetch(imageUrl, { signal: controller.signal });
    if (!imageResponse.ok) {
      clearTimeout(timeout);
      return false;
    }

    const imageBlob = await imageResponse.blob();
    const formData = new FormData();
    formData.append('chat_id', chatId);
    formData.append('photo', imageBlob, 'receipt.jpg');
    formData.append('caption', caption);

    const uploadResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });
    
    const result = await uploadResponse.json();
    clearTimeout(timeout);
    return result.ok;
  } catch (e) {
    clearTimeout(timeout);
    console.error('Photo upload error:', e);
    return false;
  }
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
      return new Response(
        JSON.stringify({ success: false, error: 'Telegram not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const message = `⚡ *طلب سحب فوري جديد*

🔗 *الكود:* \`${data.trackingCode}\`

┌─────────────────────────
│ 👤 *الداعم*
├─────────────────────────
│ 📛 ${data.supporterName}
│ 🆔 \`${data.supporterAccountId}\`
│ 💵 $${data.supporterAmountUsd}
│ 💳 ${data.supporterPaymentMethod}
└─────────────────────────

┌─────────────────────────
│ 🎤 *المضيف*
├─────────────────────────
│ 📛 ${data.hostName}
│ 🆔 \`${data.hostAccountId}\`
│ 🪙 ${data.hostCoinsAmount.toLocaleString()} كوينز
│ 💰 *$${data.hostPayoutAmount}*
│ 🔑 \`${data.hostReferenceNumber}\`
└─────────────────────────

┌─────────────────────────
│ 💸 *التحويل*
├─────────────────────────
│ 🌍 ${data.hostCountry}
│ 📱 ${data.hostPhoneNumber}
│ 💳 ${data.hostPayoutMethod}
│ 📝 ${data.hostRecipientFullName}
└─────────────────────────`;

    // Send all in parallel for speed
    const promises: Promise<any>[] = [
      fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: message,
          parse_mode: 'Markdown',
        }),
      }).then(r => r.json()),
    ];

    // Add photo uploads in parallel
    if (data.supporterReceiptUrl) {
      promises.push(
        uploadPhoto(
          TELEGRAM_BOT_TOKEN,
          TELEGRAM_CHAT_ID,
          data.supporterReceiptUrl,
          `📷 *إيصال الداعم*\n👤 ${data.supporterName}\n💵 $${data.supporterAmountUsd}`
        )
      );
    }

    if (data.hostReceiptUrl) {
      promises.push(
        uploadPhoto(
          TELEGRAM_BOT_TOKEN,
          TELEGRAM_CHAT_ID,
          data.hostReceiptUrl,
          `📷 *إيصال المضيف*\n🎤 ${data.hostName}\n🔑 ${data.hostReferenceNumber}`
        )
      );
    }

    const results = await Promise.all(promises);
    const textResult = results[0];

    return new Response(
      JSON.stringify({ 
        success: textResult.ok,
        supporterPhotoSent: results[1] || false,
        hostPhotoSent: results[2] || false,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
