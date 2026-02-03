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
  banTypeDuration: string;
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

    // Get ban duration based on type
    const banDuration = data.banTypeDuration || (data.banType === 'ترويج' ? 'دائم' : '24 ساعة');

    const message = `🚨 *بلاغ تبنيد جديد*

📋 *تفاصيل البلاغ:*
• الايدي: \`${data.reportedUserId}\`
• سبب البند: *${data.banType}*
• نوع البند: ${data.banType === 'ترويج' ? 'دائم 🔴' : 'عادي'}
• مدة البند: *${banDuration}* ⏰
${data.reward ? `• المكافأة: ${data.reward.toLocaleString()} كوينز 💰` : ''}

📝 *التفاصيل:*
${data.description}

👤 المُبلِّغ: \`${data.reporterGalaId}\`
📎 الدليل: ${data.evidenceType === 'video' ? '🎬 فيديو' : '📷 صورة'}`;

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
        // First, download the media file
        console.log('Downloading media from:', data.evidenceUrl);
        const mediaResponse = await fetch(data.evidenceUrl);
        
        if (!mediaResponse.ok) {
          console.error('Failed to download media:', mediaResponse.status);
        } else {
          const mediaBlob = await mediaResponse.blob();
          const formData = new FormData();
          formData.append('chat_id', TELEGRAM_CHAT_ID);
          
          const caption = `🚨 الايدي: ${data.reportedUserId}\n📌 سبب البند: ${data.banType}\n⏰ المدة: ${banDuration}`;
          
          if (data.evidenceType === 'video') {
            formData.append('video', mediaBlob, 'evidence.mp4');
            formData.append('caption', caption);
            
            const uploadResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendVideo`, {
              method: 'POST',
              body: formData,
            });
            mediaResult = await uploadResponse.json();
          } else {
            formData.append('photo', mediaBlob, 'evidence.jpg');
            formData.append('caption', caption);
            
            const uploadResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, {
              method: 'POST',
              body: formData,
            });
            mediaResult = await uploadResponse.json();
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
