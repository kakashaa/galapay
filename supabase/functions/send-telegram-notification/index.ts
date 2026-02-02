import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface NotificationRequest {
  imageUrl: string;
  requestDetails: {
    trackingCode: string;
    zalalLifeAccountId: string;
    zalalLifeUsername?: string;
    recipientName: string;
    amount: number;
    country: string;
    payoutMethod: string;
    phoneNumber: string;
    referenceNumber?: string;
    walletNumber?: string;
    methodFields?: Record<string, string>;
    agencyCode?: string;
  };
}

// Fast image upload with timeout
async function sendPhotoFast(
  botToken: string,
  chatId: string,
  imageUrl: string,
  caption: string
): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

  try {
    // Try URL method first (fastest)
    const urlResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, photo: imageUrl, caption }),
      signal: controller.signal,
    });
    
    const urlResult = await urlResponse.json();
    if (urlResult.ok) {
      clearTimeout(timeout);
      return true;
    }

    // Fallback: download and upload
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
    
    const uploadResult = await uploadResponse.json();
    clearTimeout(timeout);
    return uploadResult.ok;
  } catch (e) {
    clearTimeout(timeout);
    console.error('Photo send error:', e);
    return false;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl, requestDetails }: NotificationRequest = await req.json();
    
    const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
    const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID');
    
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      return new Response(
        JSON.stringify({ success: false, error: 'Telegram not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract wallet number
    const walletNumber = requestDetails.walletNumber || 
                        requestDetails.methodFields?.walletNumber || 
                        requestDetails.methodFields?.wallet_number ||
                        requestDetails.methodFields?.رقم_المحفظة ||
                        (requestDetails.methodFields ? Object.values(requestDetails.methodFields).find(v => v) : '') || '';

    const message = `🔔 *طلب صرف شهري جديد*

📋 *التفاصيل:*
┣ 🔗 الكود: \`${requestDetails.trackingCode}\`
┣ 🆔 الايدي: \`${requestDetails.zalalLifeAccountId}\`
${requestDetails.zalalLifeUsername ? `┣ 👤 الاسم: ${requestDetails.zalalLifeUsername}\n` : ''}${requestDetails.agencyCode ? `┣ 🏢 الوكالة: ${requestDetails.agencyCode}\n` : ''}┣ 📝 المستلم: ${requestDetails.recipientName}
┣ 💵 المبلغ: *$${requestDetails.amount}*
┣ 🌍 البلد: ${requestDetails.country}
┣ 💳 الطريقة: ${requestDetails.payoutMethod}
┣ 📱 الهاتف: ${requestDetails.phoneNumber}
${walletNumber ? `┣ 🔢 المحفظة: \`${walletNumber}\`\n` : ''}${requestDetails.referenceNumber ? `┗ 🔑 المرجع: \`${requestDetails.referenceNumber}\`` : '┗ ✅ جاهز للمعالجة'}`;

    // Send text and photo in parallel
    const textPromise = fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'Markdown',
      }),
    }).then(r => r.json());

    const photoPromise = imageUrl 
      ? sendPhotoFast(TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, imageUrl, `📷 إيصال: ${requestDetails.recipientName} - $${requestDetails.amount}`)
      : Promise.resolve(false);

    const [textResult, photoSent] = await Promise.all([textPromise, photoPromise]);

    return new Response(
      JSON.stringify({ success: textResult.ok, photoSent }),
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
