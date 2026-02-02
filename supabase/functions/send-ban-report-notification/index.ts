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

// Enhanced media upload
async function sendMedia(
  botToken: string,
  chatId: string,
  mediaUrl: string,
  caption: string,
  isVideo: boolean
): Promise<{ sent: boolean; error?: string }> {
  console.log(`📎 Sending ${isVideo ? 'video' : 'photo'}:`, mediaUrl.substring(0, 100));
  
  try {
    // Download media first
    console.log('📎 Downloading media...');
    const mediaResponse = await fetch(mediaUrl);
    
    if (!mediaResponse.ok) {
      console.error('📎 Download failed:', mediaResponse.status);
      return { sent: false, error: `Download failed: ${mediaResponse.status}` };
    }

    const contentType = mediaResponse.headers.get('content-type');
    const mediaBuffer = await mediaResponse.arrayBuffer();
    console.log(`📎 Media size: ${mediaBuffer.byteLength} bytes, type: ${contentType}`);
    
    if (mediaBuffer.byteLength === 0) {
      return { sent: false, error: 'Empty media file' };
    }

    const formData = new FormData();
    formData.append('chat_id', chatId);
    formData.append('caption', caption.substring(0, 1024));
    formData.append('parse_mode', 'Markdown');

    const endpoint = isVideo ? 'sendVideo' : 'sendPhoto';
    const fieldName = isVideo ? 'video' : 'photo';
    const fileName = isVideo ? 'evidence.mp4' : 'evidence.jpg';
    
    const blob = new Blob([mediaBuffer], { type: contentType || (isVideo ? 'video/mp4' : 'image/jpeg') });
    formData.append(fieldName, blob, fileName);

    console.log(`📎 Uploading to Telegram as ${endpoint}...`);
    const uploadResponse = await fetch(`https://api.telegram.org/bot${botToken}/${endpoint}`, {
      method: 'POST',
      body: formData,
    });

    const result = await uploadResponse.json();
    console.log('📎 Upload result:', JSON.stringify(result));
    
    return { sent: result.ok, error: result.description };
    
  } catch (error) {
    console.error('📎 Media send error:', error);
    return { sent: false, error: String(error) };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  console.log('🚨 Starting ban report notification...');

  try {
    const data: BanReportNotificationRequest = await req.json();
    console.log('📋 Report for user:', data.reportedUserId);
    
    const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
    const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID');
    
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      return new Response(
        JSON.stringify({ success: false, error: 'Telegram not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Ban type mapping
    const banTypeInfo: Record<string, { emoji: string; arabic: string; duration: string }> = {
      'promotion': { emoji: '📢', arabic: 'ترويج لتطبيق آخر', duration: '🔴 دائم' },
      'insult': { emoji: '🤬', arabic: 'شتم أو إهانة', duration: '⏰ 24 ساعة' },
      'defamation': { emoji: '📛', arabic: 'تشهير', duration: '⏰ 24 ساعة' },
      'ترويج': { emoji: '📢', arabic: 'ترويج لتطبيق آخر', duration: '🔴 دائم' },
      'شتم': { emoji: '🤬', arabic: 'شتم أو إهانة', duration: '⏰ 24 ساعة' },
      'تشهير': { emoji: '📛', arabic: 'تشهير', duration: '⏰ 24 ساعة' },
    };

    const typeInfo = banTypeInfo[data.banType] || { emoji: '⚠️', arabic: data.banType, duration: data.banTypeDuration };
    const banDuration = data.banTypeDuration || typeInfo.duration;
    const isPermanent = data.banType === 'ترويج' || data.banType === 'promotion';

    const message = `🚨 *بلاغ تبنيد جديد*

╔══════════════════════════════╗
║     📋 *تفاصيل البلاغ*
╠══════════════════════════════╣
║
║  🎯 *الايدي المبلغ عنه:*
║  \`${data.reportedUserId}\`
║
╠──────────────────────────────╣
║
║  ${typeInfo.emoji} *نوع المخالفة:*
║  ${typeInfo.arabic}
║
╠──────────────────────────────╣
║
║  ⏱️ *مدة البند:*
║  ${banDuration} ${isPermanent ? '🔒' : ''}
║
${data.reward ? `╠──────────────────────────────╣
║
║  💰 *المكافأة:*
║  ${data.reward.toLocaleString()} كوينز
║
` : ''}╚══════════════════════════════╝

${data.description ? `📝 *الوصف:*
━━━━━━━━━━━━━━━━━━━━
${data.description.substring(0, 500)}
━━━━━━━━━━━━━━━━━━━━

` : ''}👮 *المُبلِّغ:* \`${data.reporterGalaId}\`
📎 *الدليل:* ${data.evidenceType === 'video' ? '🎬 فيديو' : '📷 صورة'}`;

    // Send text message
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
    console.log('📤 Text result:', textResult.ok ? 'SUCCESS' : 'FAILED', textResult.description || '');

    // Send evidence media
    let mediaResult: { sent: boolean; error?: string } = { sent: false, error: 'No evidence URL' };
    if (data.evidenceUrl) {
      const mediaCaption = `🚨 *دليل البلاغ*

🎯 الايدي: \`${data.reportedUserId}\`
${typeInfo.emoji} السبب: ${typeInfo.arabic}
⏱️ المدة: ${banDuration}`;

      mediaResult = await sendMedia(
        TELEGRAM_BOT_TOKEN,
        TELEGRAM_CHAT_ID,
        data.evidenceUrl,
        mediaCaption,
        data.evidenceType === 'video'
      );
    }

    const duration = Date.now() - startTime;
    console.log(`✅ Completed in ${duration}ms - Text: ${textResult.ok}, Media: ${mediaResult.sent}`);

    return new Response(
      JSON.stringify({ 
        success: textResult.ok, 
        mediaSent: mediaResult.sent,
        mediaError: mediaResult.error,
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
