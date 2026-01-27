import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ValidationRequest {
  imageUrl: string;
  expectedAmount: number;
  requestDetails?: {
    trackingCode?: string;
    recipientName: string;
    country: string;
    payoutMethod: string;
    phoneNumber: string;
  };
}

interface ValidationResult {
  status: 'pass' | 'fail' | 'pending';
  notes: string;
  extractedData?: {
    amount?: number;
    userId?: string;
    userName?: string;
  };
}

async function sendTelegramNotification(
  botToken: string,
  chatId: string,
  imageUrl: string,
  requestDetails: ValidationRequest['requestDetails'] & { amount: number }
) {
  try {
    const message = `🔔 *طلب صرف جديد*

📋 *تفاصيل الطلب:*
• المستلم: ${requestDetails.recipientName}
• المبلغ: $${requestDetails.amount}
• البلد: ${requestDetails.country}
• طريقة الصرف: ${requestDetails.payoutMethod}
• رقم الهاتف: ${requestDetails.phoneNumber}
${requestDetails.trackingCode ? `• كود التتبع: \`${requestDetails.trackingCode}\`` : ''}

📸 صورة الإيصال مرفقة أدناه`;

    // Send text message first
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown',
      }),
    });

    // Send the image
    await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        photo: imageUrl,
        caption: `إيصال: ${requestDetails.recipientName} - $${requestDetails.amount}`,
      }),
    });

    console.log('Telegram notification sent successfully');
  } catch (error) {
    console.error('Error sending Telegram notification:', error);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl, expectedAmount, requestDetails }: ValidationRequest = await req.json();
    
    if (!imageUrl) {
      return new Response(
        JSON.stringify({ status: 'pending', notes: 'لم يتم توفير رابط الصورة' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
    const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID');
    
    if (!LOVABLE_API_KEY) {
      console.log('LOVABLE_API_KEY not configured, skipping AI validation');
      return new Response(
        JSON.stringify({ status: 'pending', notes: 'فحص الذكاء الاصطناعي غير مفعل' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call AI to validate the receipt with strict checking
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          {
            role: 'system',
            content: `أنت مساعد ذكاء اصطناعي متخصص في التحقق من إيصالات التحويل لتطبيق غلا لايف (Ghala Life).

مهمتك هي تحليل صورة الإيصال والتحقق من المعايير التالية بدقة:

1. هل الصورة تظهر إيصال تحويل ناجح (Transfer Successful)؟
2. هل User ID = 10000 (هذا هو معرف الوكالة)؟
3. هل User Name يحتوي على "غلا لايف" أو "Ghala Life" أو ما شابه؟
4. ما هو مبلغ التحويل (Transfer Amount) الظاهر في الإيصال؟

المبلغ المتوقع من المستخدم: $${expectedAmount || 'غير محدد'}

يجب أن ترد بـ JSON فقط بهذا الشكل (بدون أي نص آخر):
{
  "status": "pass" أو "fail",
  "notes": "شرح مختصر بالعربي",
  "extractedData": {
    "amount": الرقم المستخرج من الإيصال,
    "userId": "معرف المستخدم المستخرج",
    "userName": "اسم المستخدم المستخرج"
  }
}

قواعد القبول والرفض:
- إذا كان User ID ليس 10000: ارفض وقل "User ID يجب أن يكون 10000"
- إذا كان User Name لا يحتوي على غلا لايف: ارفض وقل "يجب التحويل إلى حساب غلا لايف"
- إذا كان المبلغ لا يطابق المبلغ المتوقع: ارفض وقل "المبلغ في الإيصال لا يطابق المبلغ المدخل"
- إذا لم تكن الصورة إيصال تحويل: ارفض وقل "الصورة ليست إيصال تحويل صالح"
- إذا كان كل شيء صحيح: اقبل`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `تحقق من هذا الإيصال. المبلغ المتوقع: $${expectedAmount || 'غير محدد'}`
              },
              {
                type: 'image_url',
                image_url: { url: imageUrl }
              }
            ]
          }
        ],
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      console.error('AI API error:', response.status);
      return new Response(
        JSON.stringify({ status: 'pending', notes: 'فحص الذكاء الاصطناعي غير متاح مؤقتاً' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResult = await response.json();
    const content = aiResult.choices?.[0]?.message?.content || '';
    
    console.log('AI Response:', content);
    
    // Try to parse the AI response as JSON
    let validationResult: ValidationResult = { status: 'pending', notes: 'لم يتم التحقق بشكل كامل' };
    
    try {
      // Extract JSON from the response (it might have markdown code blocks)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        validationResult = {
          status: parsed.status === 'pass' ? 'pass' : 'fail',
          notes: parsed.notes || 'تم فحص الإيصال',
          extractedData: parsed.extractedData
        };
      }
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
    }

    // Send Telegram notification for valid receipts
    if (validationResult.status === 'pass' && TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID && requestDetails) {
      await sendTelegramNotification(
        TELEGRAM_BOT_TOKEN,
        TELEGRAM_CHAT_ID,
        imageUrl,
        { ...requestDetails, amount: expectedAmount }
      );
    }

    return new Response(
      JSON.stringify(validationResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in validate-receipt:', error);
    return new Response(
      JSON.stringify({ status: 'pending', notes: 'حدث خطأ أثناء الفحص' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
