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

// Enhanced photo upload with better error handling
async function sendPhoto(
  botToken: string,
  chatId: string,
  imageUrl: string,
  caption: string
): Promise<{ sent: boolean; error?: string }> {
  console.log('📷 Attempting to send photo:', imageUrl.substring(0, 100));
  
  try {
    // Method 1: Try direct URL (fastest for public URLs)
    console.log('📷 Method 1: Direct URL...');
    const urlResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        chat_id: chatId, 
        photo: imageUrl, 
        caption: caption.substring(0, 1024) 
      }),
    });
    
    const urlResult = await urlResponse.json();
    console.log('📷 Method 1 result:', JSON.stringify(urlResult));
    
    if (urlResult.ok) {
      return { sent: true };
    }

    // Method 2: Download and upload as binary
    console.log('📷 Method 2: Download and re-upload...');
    const imageResponse = await fetch(imageUrl);
    
    if (!imageResponse.ok) {
      console.error('📷 Failed to download image:', imageResponse.status, imageResponse.statusText);
      return { sent: false, error: `Download failed: ${imageResponse.status}` };
    }

    const contentType = imageResponse.headers.get('content-type');
    console.log('📷 Image content-type:', contentType);
    
    const imageBuffer = await imageResponse.arrayBuffer();
    console.log('📷 Image size:', imageBuffer.byteLength, 'bytes');
    
    if (imageBuffer.byteLength === 0) {
      return { sent: false, error: 'Empty image' };
    }

    const formData = new FormData();
    formData.append('chat_id', chatId);
    formData.append('caption', caption.substring(0, 1024));
    
    // Determine extension based on content type
    const ext = contentType?.includes('png') ? 'png' : 'jpg';
    const blob = new Blob([imageBuffer], { type: contentType || 'image/jpeg' });
    formData.append('photo', blob, `receipt.${ext}`);

    const uploadResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
      method: 'POST',
      body: formData,
    });
    
    const uploadResult = await uploadResponse.json();
    console.log('📷 Method 2 result:', JSON.stringify(uploadResult));
    
    return { sent: uploadResult.ok, error: uploadResult.description };
    
  } catch (error) {
    console.error('📷 Photo send error:', error);
    return { sent: false, error: String(error) };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  console.log('🚀 Starting notification handler...');

  try {
    const { imageUrl, requestDetails }: NotificationRequest = await req.json();
    console.log('📋 Request for:', requestDetails.trackingCode);
    
    const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
    const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID');
    
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      console.error('❌ Telegram credentials missing');
      return new Response(
        JSON.stringify({ success: false, error: 'Telegram not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract wallet number from various sources
    const walletNumber = requestDetails.walletNumber || 
                        requestDetails.methodFields?.walletNumber || 
                        requestDetails.methodFields?.wallet_number ||
                        requestDetails.methodFields?.رقم_المحفظة ||
                        (requestDetails.methodFields ? Object.values(requestDetails.methodFields).find(v => v) : '') || '';

    const message = `🔔 *طلب صرف شهري جديد*

╔═══════════════════════════╗
║  📋 *تفاصيل الطلب*
╠═══════════════════════════╣
║ 🔗 الكود: \`${requestDetails.trackingCode}\`
║ 🆔 الايدي: \`${requestDetails.zalalLifeAccountId}\`
${requestDetails.zalalLifeUsername ? `║ 👤 الاسم: ${requestDetails.zalalLifeUsername}\n` : ''}${requestDetails.agencyCode ? `║ 🏢 الوكالة: ${requestDetails.agencyCode}\n` : ''}║ 📝 المستلم: ${requestDetails.recipientName}
║ 💵 المبلغ: *$${requestDetails.amount}*
╠═══════════════════════════╣
║ 🌍 البلد: ${requestDetails.country}
║ 💳 الطريقة: ${requestDetails.payoutMethod}
║ 📱 الهاتف: ${requestDetails.phoneNumber}
${walletNumber ? `║ 🔢 المحفظة: \`${walletNumber}\`\n` : ''}╚═══════════════════════════╝
${requestDetails.referenceNumber ? `\n🔑 *المرجع:* \`${requestDetails.referenceNumber}\`` : ''}`;

    // Send text message first (fast)
    console.log('📤 Sending text message...');
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
    console.log('📤 Text result:', textResult.ok ? 'SUCCESS' : 'FAILED');
    
    // Send photo
    let photoResult: { sent: boolean; error?: string } = { sent: false, error: 'No image URL' };
    if (imageUrl) {
      photoResult = await sendPhoto(
        TELEGRAM_BOT_TOKEN, 
        TELEGRAM_CHAT_ID, 
        imageUrl, 
        `📷 *إيصال الدفع*\n👤 ${requestDetails.recipientName}\n💵 $${requestDetails.amount}`
      );
    }

    const duration = Date.now() - startTime;
    console.log(`✅ Completed in ${duration}ms - Text: ${textResult.ok}, Photo: ${photoResult.sent}`);

    return new Response(
      JSON.stringify({ 
        success: textResult.ok, 
        photoSent: photoResult.sent,
        photoError: photoResult.error,
        duration 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
