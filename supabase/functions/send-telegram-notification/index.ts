import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
  };
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
      console.log('Telegram credentials not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Telegram not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract wallet number from methodFields if available
    const walletNumber = requestDetails.walletNumber || 
                        requestDetails.methodFields?.walletNumber || 
                        requestDetails.methodFields?.wallet_number ||
                        requestDetails.methodFields?.رقم_المحفظة ||
                        (requestDetails.methodFields ? Object.values(requestDetails.methodFields).find(v => v) : '') || '';

    const message = `🔔 *طلب صرف جديد*

📋 *تفاصيل الطلب:*
• كود التتبع: \`${requestDetails.trackingCode}\`
• ايدي غلا لايف: ${requestDetails.zalalLifeAccountId}
${requestDetails.zalalLifeUsername ? `• اسم في غلا لايف: ${requestDetails.zalalLifeUsername}` : ''}
• اسم المستلم: ${requestDetails.recipientName}
• المبلغ: $${requestDetails.amount}
• البلد: ${requestDetails.country}
• طريقة الصرف: ${requestDetails.payoutMethod}
• رقم الهاتف: ${requestDetails.phoneNumber}
${walletNumber ? `• رقم المحفظة: \`${walletNumber}\`` : ''}
${requestDetails.referenceNumber ? `• الرقم المرجعي: \`${requestDetails.referenceNumber}\`` : ''}

📸 صورة الإيصال مرفقة أدناه`;

    // Send text message first
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

    // Try to send the image - first attempt with URL
    let photoResult = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        photo: imageUrl,
        caption: `إيصال: ${requestDetails.recipientName} - $${requestDetails.amount}`,
      }),
    }).then(res => res.json());

    console.log('Telegram photo response:', photoResult);

    // If URL method fails, try downloading and uploading the image
    if (!photoResult.ok && imageUrl) {
      try {
        console.log('URL method failed, trying to fetch and upload image...');
        const imageResponse = await fetch(imageUrl);
        if (imageResponse.ok) {
          const imageBlob = await imageResponse.blob();
          const formData = new FormData();
          formData.append('chat_id', TELEGRAM_CHAT_ID);
          formData.append('photo', imageBlob, 'receipt.jpg');
          formData.append('caption', `إيصال: ${requestDetails.recipientName} - $${requestDetails.amount}`);
          
          const uploadResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, {
            method: 'POST',
            body: formData,
          });
          photoResult = await uploadResponse.json();
          console.log('Telegram photo upload response:', photoResult);
        }
      } catch (uploadError) {
        console.error('Failed to upload image directly:', uploadError);
      }
    }

    if (textResult.ok) {
      console.log('Telegram notification sent successfully (text sent, photo may have issues)');
      return new Response(
        JSON.stringify({ success: true, photoSent: photoResult.ok }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      console.error('Telegram API error:', { textResult, photoResult });
      return new Response(
        JSON.stringify({ success: false, error: 'Telegram API error' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Error in send-telegram-notification:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
