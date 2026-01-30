import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface BanReportNotificationRequest {
  reportId: string;
  reporterGalaId: string;
  reportedUserId: string;
  banType: string;
  description: string;
  evidenceUrl: string;
  evidenceType: 'image' | 'video';
  reward?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const data: BanReportNotificationRequest = await req.json();
    
    const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
    const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID');
    
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      console.log('Telegram credentials not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Telegram not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const message = `🚨 *بلاغ تبنيد جديد*

📋 *تفاصيل البلاغ:*
• رقم البلاغ: \`${data.reportId.substring(0, 8).toUpperCase()}\`
• آيدي المُبلِّغ: \`${data.reporterGalaId}\`
• آيدي المُبلَّغ عنه: \`${data.reportedUserId}\`
• نوع المخالفة: *${data.banType}*
${data.reward ? `• المكافأة المحتملة: ${data.reward.toLocaleString()} كوينز 💰` : ''}

📝 *الوصف:*
${data.description}

📎 نوع الإثبات: ${data.evidenceType === 'video' ? '🎬 فيديو' : '📷 صورة'}`;

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

    // Send evidence (photo or video)
    let mediaResult: any = { ok: false };
    
    if (data.evidenceUrl) {
      try {
        if (data.evidenceType === 'video') {
          // Try sending video by URL first
          const videoResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendVideo`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: TELEGRAM_CHAT_ID,
              video: data.evidenceUrl,
              caption: `🎬 إثبات البلاغ - ${data.banType}`,
            }),
          });
          mediaResult = await videoResponse.json();
          
          // If URL method fails, try downloading and uploading
          if (!mediaResult.ok) {
            console.log('Video URL method failed, trying to fetch and upload...');
            const mediaResponse = await fetch(data.evidenceUrl);
            if (mediaResponse.ok) {
              const mediaBlob = await mediaResponse.blob();
              const formData = new FormData();
              formData.append('chat_id', TELEGRAM_CHAT_ID);
              formData.append('video', mediaBlob, 'evidence.mp4');
              formData.append('caption', `🎬 إثبات البلاغ - ${data.banType}`);
              
              const uploadResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendVideo`, {
                method: 'POST',
                body: formData,
              });
              mediaResult = await uploadResponse.json();
            }
          }
        } else {
          // Send photo
          const photoResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: TELEGRAM_CHAT_ID,
              photo: data.evidenceUrl,
              caption: `📷 إثبات البلاغ - ${data.banType}`,
            }),
          });
          mediaResult = await photoResponse.json();
          
          // If URL method fails, try downloading and uploading
          if (!mediaResult.ok) {
            console.log('Photo URL method failed, trying to fetch and upload...');
            const mediaResponse = await fetch(data.evidenceUrl);
            if (mediaResponse.ok) {
              const mediaBlob = await mediaResponse.blob();
              const formData = new FormData();
              formData.append('chat_id', TELEGRAM_CHAT_ID);
              formData.append('photo', mediaBlob, 'evidence.jpg');
              formData.append('caption', `📷 إثبات البلاغ - ${data.banType}`);
              
              const uploadResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, {
                method: 'POST',
                body: formData,
              });
              mediaResult = await uploadResponse.json();
            }
          }
        }
        
        console.log('Telegram media response:', mediaResult);
      } catch (mediaError) {
        console.error('Failed to send media:', mediaError);
      }
    }

    if (textResult.ok) {
      console.log('Ban report notification sent successfully');
      return new Response(
        JSON.stringify({ success: true, mediaSent: mediaResult.ok }),
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
    console.error('Error in send-ban-report-notification:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
