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

// Fast media upload with timeout
async function uploadMedia(
  botToken: string,
  chatId: string,
  mediaUrl: string,
  caption: string,
  isVideo: boolean
): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000); // 30s for videos

  try {
    const mediaResponse = await fetch(mediaUrl, { signal: controller.signal });
    if (!mediaResponse.ok) {
      clearTimeout(timeout);
      return false;
    }

    const mediaBlob = await mediaResponse.blob();
    const formData = new FormData();
    formData.append('chat_id', chatId);
    formData.append('caption', caption);
    formData.append('parse_mode', 'Markdown');

    const endpoint = isVideo ? 'sendVideo' : 'sendPhoto';
    const fileName = isVideo ? 'evidence.mp4' : 'evidence.jpg';
    formData.append(isVideo ? 'video' : 'photo', mediaBlob, fileName);

    const uploadResponse = await fetch(`https://api.telegram.org/bot${botToken}/${endpoint}`, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });

    const result = await uploadResponse.json();
    clearTimeout(timeout);
    return result.ok;
  } catch (e) {
    clearTimeout(timeout);
    console.error('Media upload error:', e);
    return false;
  }
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
      return new Response(
        JSON.stringify({ success: false, error: 'Telegram not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Ban type mapping
    const banTypeArabic: Record<string, string> = {
      promotion: '📢 ترويج لتطبيق آخر',
      insult: '🤬 شتم أو إهانة',
      defamation: '📛 تشهير',
      'ترويج': '📢 ترويج لتطبيق آخر',
      'شتم': '🤬 شتم أو إهانة',
      'تشهير': '📛 تشهير',
    };

    const banDuration = data.banTypeDuration || (data.banType === 'ترويج' || data.banType === 'promotion' ? '🔴 دائم' : '⏰ 24 ساعة');
    const isPermanent = data.banType === 'ترويج' || data.banType === 'promotion';

    const message = `🚨 *بلاغ تبنيد جديد*

╔══════════════════════════╗
║  📋 *تفاصيل البلاغ*
╠══════════════════════════╣
║ 🎯 *الايدي المبلغ عنه:*
║ \`${data.reportedUserId}\`
╠══════════════════════════╣
║ 📌 *نوع المخالفة:*
║ ${banTypeArabic[data.banType] || data.banType}
╠══════════════════════════╣
║ ⏱️ *مدة البند:*
║ ${banDuration} ${isPermanent ? '🔒' : ''}
${data.reward ? `╠══════════════════════════╣
║ 💰 *المكافأة:*
║ ${data.reward.toLocaleString()} كوينز` : ''}
╚══════════════════════════╝

${data.description ? `📝 *الوصف:*
\`\`\`
${data.description.substring(0, 500)}
\`\`\`` : ''}

👮 *المُبلِّغ:* \`${data.reporterGalaId}\`
📎 *الدليل:* ${data.evidenceType === 'video' ? '🎬 فيديو' : '📷 صورة'}`;

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

    // Send evidence media
    let mediaSent = false;
    if (data.evidenceUrl) {
      const mediaCaption = `🚨 *دليل البلاغ*
🎯 الايدي: \`${data.reportedUserId}\`
📌 السبب: ${banTypeArabic[data.banType] || data.banType}
⏱️ المدة: ${banDuration}`;

      mediaSent = await uploadMedia(
        TELEGRAM_BOT_TOKEN,
        TELEGRAM_CHAT_ID,
        data.evidenceUrl,
        mediaCaption,
        data.evidenceType === 'video'
      );
    }

    return new Response(
      JSON.stringify({ success: textResult.ok, mediaSent }),
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
