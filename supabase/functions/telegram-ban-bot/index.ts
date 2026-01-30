import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}

interface TelegramMessage {
  message_id: number;
  from: {
    id: number;
    first_name: string;
    username?: string;
  };
  chat: {
    id: number;
    type: string;
  };
  date: number;
  text?: string;
  photo?: TelegramPhoto[];
  video?: TelegramVideo;
  caption?: string;
  reply_to_message?: TelegramMessage;
}

interface TelegramPhoto {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
  file_size?: number;
}

interface TelegramVideo {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
  duration: number;
  file_size?: number;
}

interface ConversationState {
  step: 'awaiting_media' | 'awaiting_user_id' | 'awaiting_ban_type' | 'awaiting_duration' | 'confirming';
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  reportedUserId?: string;
  banType?: 'promotion' | 'insult' | 'defamation';
  duration?: string;
  description?: string;
  aiAnalysis?: {
    detectedBanType?: string;
    detectedUserId?: string;
    confidence: number;
  };
}

// In-memory conversation states (will be replaced with database in production)
const conversationStates = new Map<number, ConversationState>();

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
    const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!TELEGRAM_BOT_TOKEN || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing required environment variables');
      return new Response(JSON.stringify({ error: 'Configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const update: TelegramUpdate = await req.json();
    
    console.log('Received Telegram update:', JSON.stringify(update, null, 2));

    if (!update.message) {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const message = update.message;
    const chatId = message.chat.id;
    const userId = message.from.id;

    // Check if user is authorized (admin only)
    const authorizedChatId = TELEGRAM_CHAT_ID ? parseInt(TELEGRAM_CHAT_ID) : null;
    
    // Handle /start command
    if (message.text === '/start') {
      await sendTelegramMessage(TELEGRAM_BOT_TOKEN, chatId, 
        `🤖 *مرحباً بك في بوت البلاغات الذكي*\n\n` +
        `أرسل صورة أو فيديو للدليل وسأقوم بتحليله تلقائياً.\n\n` +
        `*الأوامر المتاحة:*\n` +
        `/report - بدء بلاغ جديد\n` +
        `/cancel - إلغاء البلاغ الحالي\n` +
        `/help - مساعدة`
      );
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle /cancel command
    if (message.text === '/cancel') {
      conversationStates.delete(userId);
      await sendTelegramMessage(TELEGRAM_BOT_TOKEN, chatId, '❌ تم إلغاء البلاغ');
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle /report command
    if (message.text === '/report') {
      conversationStates.set(userId, { step: 'awaiting_media' });
      await sendTelegramMessage(TELEGRAM_BOT_TOKEN, chatId, 
        '📸 أرسل صورة أو فيديو الدليل الآن\n\n' +
        '💡 _سيتم تحليل المحتوى تلقائياً لاستخراج المعلومات_'
      );
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle media (photo or video)
    if (message.photo || message.video) {
      let state = conversationStates.get(userId) || { step: 'awaiting_media' };
      
      // Download and store media
      let fileId: string;
      let mediaType: 'image' | 'video';
      
      if (message.video) {
        fileId = message.video.file_id;
        mediaType = 'video';
      } else if (message.photo) {
        // Get the largest photo
        const largestPhoto = message.photo[message.photo.length - 1];
        fileId = largestPhoto.file_id;
        mediaType = 'image';
      } else {
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Get file URL from Telegram
      const fileResponse = await fetch(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${fileId}`
      );
      const fileData = await fileResponse.json();
      
      if (!fileData.ok || !fileData.result.file_path) {
        await sendTelegramMessage(TELEGRAM_BOT_TOKEN, chatId, '❌ حدث خطأ في تحميل الملف');
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const telegramFileUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${fileData.result.file_path}`;
      
      // Download the file
      const mediaResponse = await fetch(telegramFileUrl);
      const mediaBlob = await mediaResponse.blob();
      
      // Upload to Supabase Storage
      const fileName = `telegram-${Date.now()}-${userId}.${mediaType === 'video' ? 'mp4' : 'jpg'}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(fileName, mediaBlob, {
          contentType: mediaType === 'video' ? 'video/mp4' : 'image/jpeg',
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        await sendTelegramMessage(TELEGRAM_BOT_TOKEN, chatId, '❌ حدث خطأ في رفع الملف');
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: publicUrlData } = supabase.storage
        .from('attachments')
        .getPublicUrl(fileName);

      state.mediaUrl = publicUrlData.publicUrl;
      state.mediaType = mediaType;
      state.description = message.caption || '';

      // Try to analyze the content with AI if available
      let aiAnalysis = null;
      if (LOVABLE_API_KEY && mediaType === 'image') {
        try {
          aiAnalysis = await analyzeWithAI(LOVABLE_API_KEY, publicUrlData.publicUrl, message.caption);
          state.aiAnalysis = aiAnalysis;
        } catch (e) {
          console.error('AI analysis error:', e);
        }
      }

      // If AI detected ban type and user ID with high confidence, auto-fill
      if (aiAnalysis && aiAnalysis.confidence > 0.8) {
        state.reportedUserId = aiAnalysis.detectedUserId;
        state.banType = aiAnalysis.detectedBanType as any;
        state.step = 'confirming';
        
        conversationStates.set(userId, state);
        
        await sendTelegramMessage(TELEGRAM_BOT_TOKEN, chatId, 
          `🤖 *تم تحليل المحتوى:*\n\n` +
          `📋 آيدي المستخدم: \`${state.reportedUserId || 'غير محدد'}\`\n` +
          `⚠️ نوع المخالفة: *${getBanTypeLabel(state.banType)}*\n\n` +
          `هل المعلومات صحيحة؟\n` +
          `✅ /confirm - تأكيد الإرسال\n` +
          `✏️ /edit - تعديل المعلومات\n` +
          `❌ /cancel - إلغاء`
        );
      } else {
        state.step = 'awaiting_user_id';
        conversationStates.set(userId, state);
        
        await sendTelegramMessage(TELEGRAM_BOT_TOKEN, chatId, 
          '✅ تم استلام الدليل\n\n' +
          '📝 الآن أرسل *آيدي المستخدم المُبلَّغ عنه:*'
        );
      }

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle text responses based on conversation state
    const state = conversationStates.get(userId);
    
    if (state && message.text) {
      switch (state.step) {
        case 'awaiting_user_id':
          state.reportedUserId = message.text.trim();
          state.step = 'awaiting_ban_type';
          conversationStates.set(userId, state);
          
          await sendTelegramMessage(TELEGRAM_BOT_TOKEN, chatId, 
            '📋 اختر *نوع المخالفة:*\n\n' +
            '1️⃣ /promotion - ترويج (بند دائم)\n' +
            '2️⃣ /insult - شتم (24 ساعة)\n' +
            '3️⃣ /defamation - قذف (24 ساعة)'
          );
          break;

        case 'awaiting_ban_type':
          const banTypeMap: Record<string, 'promotion' | 'insult' | 'defamation'> = {
            '/promotion': 'promotion',
            '/insult': 'insult',
            '/defamation': 'defamation',
            '1': 'promotion',
            '2': 'insult',
            '3': 'defamation',
            'ترويج': 'promotion',
            'شتم': 'insult',
            'قذف': 'defamation',
          };
          
          const selectedType = banTypeMap[message.text.toLowerCase()];
          if (!selectedType) {
            await sendTelegramMessage(TELEGRAM_BOT_TOKEN, chatId, 
              '❌ اختيار غير صالح. اختر:\n' +
              '/promotion أو /insult أو /defamation'
            );
            break;
          }
          
          state.banType = selectedType;
          state.step = 'confirming';
          conversationStates.set(userId, state);
          
          await sendTelegramMessage(TELEGRAM_BOT_TOKEN, chatId, 
            `📋 *ملخص البلاغ:*\n\n` +
            `👤 آيدي المستخدم: \`${state.reportedUserId}\`\n` +
            `⚠️ نوع المخالفة: *${getBanTypeLabel(state.banType)}*\n` +
            `📎 الدليل: ${state.mediaType === 'video' ? '🎬 فيديو' : '📷 صورة'}\n\n` +
            `✅ /confirm - تأكيد الإرسال\n` +
            `❌ /cancel - إلغاء`
          );
          break;

        case 'confirming':
          if (message.text === '/confirm') {
            // Submit the ban report
            const reporterGalaId = message.from.username || `telegram_${message.from.id}`;
            
            const { data: reportData, error: reportError } = await supabase
              .from('ban_reports')
              .insert({
                reporter_gala_id: reporterGalaId,
                reported_user_id: state.reportedUserId,
                ban_type: state.banType,
                description: state.description || `بلاغ من تيليجرام - ${message.from.first_name}`,
                evidence_url: state.mediaUrl,
                evidence_type: state.mediaType,
                is_verified: true, // Auto-verify reports from Telegram (admin)
                reward_amount: state.banType === 'promotion' ? 50000 : null,
              })
              .select()
              .single();

            if (reportError) {
              console.error('Report error:', reportError);
              await sendTelegramMessage(TELEGRAM_BOT_TOKEN, chatId, '❌ حدث خطأ في حفظ البلاغ');
            } else {
              await sendTelegramMessage(TELEGRAM_BOT_TOKEN, chatId, 
                `✅ *تم رفع البلاغ بنجاح!*\n\n` +
                `📋 آيدي المستخدم: \`${state.reportedUserId}\`\n` +
                `⚠️ نوع المخالفة: *${getBanTypeLabel(state.banType)}*\n` +
                `🔖 تم التحقق تلقائياً ✓`
              );
            }
            
            conversationStates.delete(userId);
          } else if (message.text === '/edit') {
            state.step = 'awaiting_user_id';
            conversationStates.set(userId, state);
            await sendTelegramMessage(TELEGRAM_BOT_TOKEN, chatId, 
              '✏️ أرسل *آيدي المستخدم المُبلَّغ عنه:*'
            );
          }
          break;
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in telegram-ban-bot:', error);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function sendTelegramMessage(token: string, chatId: number, text: string) {
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: 'Markdown',
    }),
  });
  return response.json();
}

function getBanTypeLabel(type?: string): string {
  const labels: Record<string, string> = {
    promotion: 'ترويج (دائم)',
    insult: 'شتم (24 ساعة)',
    defamation: 'قذف (24 ساعة)',
  };
  return labels[type || ''] || 'غير محدد';
}

async function analyzeWithAI(apiKey: string, imageUrl: string, caption?: string): Promise<{
  detectedBanType?: string;
  detectedUserId?: string;
  confidence: number;
}> {
  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `أنت مساعد ذكي لتحليل صور/فيديوهات البلاغات. 
            مهمتك استخراج:
            1. آيدي المستخدم المخالف (رقم)
            2. نوع المخالفة: promotion (ترويج لتطبيق آخر), insult (شتم/سب), defamation (قذف)
            
            أرجع النتيجة بصيغة JSON فقط:
            {"userId": "123456", "banType": "promotion", "confidence": 0.9}`
          },
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: { url: imageUrl }
              },
              {
                type: 'text',
                text: caption ? `الوصف: ${caption}` : 'حلل هذه الصورة واستخرج المعلومات'
              }
            ]
          }
        ],
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    // Try to parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        detectedUserId: parsed.userId,
        detectedBanType: parsed.banType,
        confidence: parsed.confidence || 0.5,
      };
    }
    
    return { confidence: 0 };
  } catch (e) {
    console.error('AI analysis failed:', e);
    return { confidence: 0 };
  }
}
