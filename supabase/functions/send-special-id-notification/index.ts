import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface NotificationRequest {
  requestId: string;
  galaUserId: string;
  galaUsername?: string;
  userLevel: number;
  patternCode: string;
  digitLength: number;
  preferredId?: string;
  screenshotUrl: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const data: NotificationRequest = await req.json();
    
    const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
    const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID');
    
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      console.log('Telegram credentials not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Telegram not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const message = `👑 *طلب ايدي مميز جديد*

📋 *تفاصيل الطلب:*
• رقم الطلب: \`${data.requestId.substring(0, 8).toUpperCase()}\`
• ايدي غلا لايف: \`${data.galaUserId}\`
${data.galaUsername ? `• اسم المستخدم: ${data.galaUsername}` : ''}
• المستوى: *${data.userLevel}*

🎯 *النمط المطلوب:*
• النمط: \`${data.patternCode}\`
• عدد الأرقام: ${data.digitLength}
${data.preferredId ? `• الايدي المفضل: \`${data.preferredId}\`` : ''}`;

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

    // Send screenshot
    if (data.screenshotUrl) {
      try {
        const photoResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: TELEGRAM_CHAT_ID,
            photo: data.screenshotUrl,
            caption: `📷 صورة الملف الشخصي - Level ${data.userLevel}`,
          }),
        });

        let photoResult = await photoResponse.json();
        
        // If URL method fails, try downloading and re-uploading
        if (!photoResult.ok) {
          console.log('Photo URL method failed, trying to fetch and upload...');
          const imageResponse = await fetch(data.screenshotUrl);
          if (imageResponse.ok) {
            const imageBlob = await imageResponse.blob();
            const formData = new FormData();
            formData.append('chat_id', TELEGRAM_CHAT_ID);
            formData.append('photo', imageBlob, 'screenshot.jpg');
            formData.append('caption', `📷 صورة الملف الشخصي - Level ${data.userLevel}`);
            
            const uploadResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, {
              method: 'POST',
              body: formData,
            });
            photoResult = await uploadResponse.json();
          }
        }
        
        console.log('Telegram photo response:', photoResult);
      } catch (photoError) {
        console.error('Failed to send photo:', photoError);
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
    console.error('Error in send-special-id-notification:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
