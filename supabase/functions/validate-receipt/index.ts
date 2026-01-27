import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ValidationRequest {
  imageUrl: string;
  expectedAmount: number;
  expectedReferenceNumber?: string;
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
    referenceNumber?: string;
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
    const { imageUrl, expectedAmount, expectedReferenceNumber, requestDetails }: ValidationRequest = await req.json();
    
    if (!imageUrl) {
      return new Response(
        JSON.stringify({ status: 'pending', notes: 'لم يتم توفير رابط الصورة' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
    const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID');
    
    console.log('LOVABLE_API_KEY exists:', !!LOVABLE_API_KEY);
    
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured - rejecting receipt');
      return new Response(
        JSON.stringify({ status: 'fail', notes: 'فحص الذكاء الاصطناعي غير مفعل. يرجى التواصل مع الإدارة.' }),
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

1. هل الصورة تظهر إيصال تحويل ناجح (نجاح التحويل / Transfer Successful)؟
2. هل معرف المستخدم (User ID / معرف المستخدم) = 10000 (هذا هو معرف الوكالة)؟
3. هل اسم المستخدم (User Name / اسم المستخدم) يحتوي على "غلا لايف" أو "Ghala Life"؟
4. ما هو مبلغ التحويل (Transfer Amount / مبلغ التحويل) الظاهر في الإيصال؟
5. ما هو الرقم المرجعي (Reference Number / الرقم المرجعي) في الإيصال؟

المبلغ المتوقع من المستخدم: $${expectedAmount || 'غير محدد'}
الرقم المرجعي المتوقع: ${expectedReferenceNumber || 'غير محدد'}

يجب أن ترد بـ JSON فقط بهذا الشكل (بدون أي نص آخر):
{
  "status": "pass" أو "fail",
  "notes": "شرح مختصر بالعربي",
  "extractedData": {
    "amount": الرقم المستخرج من الإيصال,
    "userId": "معرف المستخدم المستخرج",
    "userName": "اسم المستخدم المستخرج",
    "referenceNumber": "الرقم المرجعي المستخرج"
  }
}

قواعد القبول والرفض الصارمة:
- إذا كان معرف المستخدم ليس 10000: ارفض وقل "معرف المستخدم يجب أن يكون 10000 - يجب التحويل لحساب غلا لايف"
- إذا كان اسم المستخدم لا يحتوي على "غلا لايف" أو "غلا" أو "Ghala": ارفض وقل "يجب التحويل إلى حساب غلا لايف فقط"
- إذا كان المبلغ لا يطابق المبلغ المتوقع: ارفض وقل "المبلغ في الإيصال ($X) لا يطابق المبلغ المدخل ($Y)"
- إذا كان الرقم المرجعي في الإيصال لا يطابق الرقم المرجعي المدخل: ارفض وقل "الرقم المرجعي في الإيصال لا يطابق الرقم المدخل"
- إذا لم تكن الصورة إيصال تحويل واضح: ارفض وقل "الصورة ليست إيصال تحويل صالح"
- فقط إذا كان كل شيء صحيح (معرف 10000 + اسم غلا لايف + المبلغ مطابق + الرقم المرجعي مطابق): اقبل`
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
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ status: 'fail', notes: 'فحص الذكاء الاصطناعي غير متاح مؤقتاً. حاول مرة أخرى.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResult = await response.json();
    const content = aiResult.choices?.[0]?.message?.content || '';
    
    console.log('AI Response:', content);
    
    // Try to parse the AI response as JSON
    let validationResult: ValidationResult = { status: 'fail', notes: 'فشل في تحليل استجابة الذكاء الاصطناعي' };
    
    try {
      // Extract JSON from the response (it might have markdown code blocks)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        // STRICT: Only pass if explicitly "pass", otherwise fail
        validationResult = {
          status: parsed.status === 'pass' ? 'pass' : 'fail',
          notes: parsed.notes || 'تم فحص الإيصال',
          extractedData: parsed.extractedData
        };
        console.log('Parsed validation result:', validationResult);
      } else {
        console.error('No JSON found in AI response');
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
      JSON.stringify({ status: 'fail', notes: 'حدث خطأ أثناء الفحص. حاول مرة أخرى.' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
