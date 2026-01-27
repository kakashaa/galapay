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
    
    if (!LOVABLE_API_KEY) {
      console.log('LOVABLE_API_KEY not configured, skipping AI validation');
      return new Response(
        JSON.stringify({ status: 'pending', notes: 'فحص الذكاء الاصطناعي غير مفعل' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch the image and convert to base64
    let imageBase64: string;
    try {
      console.log('Fetching image from:', imageUrl);
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        console.error('Failed to fetch image:', imageResponse.status);
        return new Response(
          JSON.stringify({ status: 'pending', notes: 'فشل في تحميل صورة الإيصال' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const imageBuffer = await imageResponse.arrayBuffer();
      const uint8Array = new Uint8Array(imageBuffer);
      
      // Convert to base64
      let binary = '';
      for (let i = 0; i < uint8Array.length; i++) {
        binary += String.fromCharCode(uint8Array[i]);
      }
      imageBase64 = btoa(binary);
      
      // Determine content type
      const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
      imageBase64 = `data:${contentType};base64,${imageBase64}`;
      console.log('Image converted to base64 successfully');
    } catch (fetchError) {
      console.error('Error fetching image:', fetchError);
      return new Response(
        JSON.stringify({ status: 'pending', notes: 'خطأ في معالجة صورة الإيصال' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call AI to validate the receipt with STRICT checking - auto approve or reject
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

مهمتك هي تحليل صورة الإيصال والتحقق من المعايير التالية بدقة متناهية:

✅ شروط القبول (يجب تحقق جميعها):
1. معرف المستخدم (User ID / معرف المستخدم) = 10000 بالضبط
2. اسم المستخدم (User Name / اسم المستخدم) يحتوي على "غلا لايف" أو "غلا" أو "Ghala Life" أو "Ghala"
3. مبلغ التحويل في الإيصال يطابق المبلغ المتوقع: $${expectedAmount}
4. الرقم المرجعي في الإيصال يطابق: ${expectedReferenceNumber || 'غير محدد'}

❌ أسباب الرفض التلقائي (أي سبب واحد يكفي للرفض):
- معرف المستخدم ليس 10000 → رفض
- اسم المستخدم لا يحتوي على "غلا" → رفض
- المبلغ في الإيصال لا يطابق $${expectedAmount} → رفض
- الرقم المرجعي في الإيصال لا يطابق "${expectedReferenceNumber}" → رفض
- الصورة ليست إيصال تحويل واضح → رفض

يجب أن ترد بـ JSON فقط بهذا الشكل (بدون أي نص آخر):
{
  "status": "pass" أو "fail",
  "notes": "شرح مختصر بالعربي لسبب القبول أو الرفض",
  "extractedData": {
    "amount": الرقم المستخرج من الإيصال,
    "userId": "معرف المستخدم المستخرج",
    "userName": "اسم المستخدم المستخرج",
    "referenceNumber": "الرقم المرجعي المستخرج"
  }
}

مهم جداً:
- إذا تحققت جميع الشروط الأربعة = status: "pass" + notes تشرح أن كل شيء صحيح
- إذا فشل أي شرط واحد = status: "fail" + notes تشرح سبب الرفض بوضوح`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `تحقق من هذا الإيصال بدقة:
- المبلغ المتوقع: $${expectedAmount}
- الرقم المرجعي المتوقع: ${expectedReferenceNumber}
- يجب أن يكون معرف المستخدم: 10000
- يجب أن يكون اسم المستخدم: غلا لايف`
              },
              {
                type: 'image_url',
                image_url: { url: imageBase64 }
              }
            ]
          }
        ],
        max_tokens: 600,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ status: 'pending', notes: 'فحص الذكاء الاصطناعي غير متاح مؤقتاً' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResult = await response.json();
    console.log('AI Raw Response:', JSON.stringify(aiResult));
    const content = aiResult.choices?.[0]?.message?.content || '';
    
    console.log('AI Content:', content);
    
    // If AI returned empty content, try again with a simpler prompt
    if (!content || content.trim() === '') {
      console.log('Empty AI response, returning pending');
      return new Response(
        JSON.stringify({ status: 'pending', notes: 'لم يتمكن الذكاء الاصطناعي من قراءة الإيصال' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
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
        console.log('Parsed validation result:', JSON.stringify(validationResult));
      } else {
        console.log('No JSON found in AI response');
        // If no JSON, try to determine pass/fail from text
        if (content.includes('pass') || content.includes('مقبول') || content.includes('صحيح')) {
          validationResult = { status: 'pass', notes: content.substring(0, 200) };
        } else if (content.includes('fail') || content.includes('مرفوض') || content.includes('خطأ')) {
          validationResult = { status: 'fail', notes: content.substring(0, 200) };
        }
      }
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      validationResult = { status: 'pending', notes: 'خطأ في تحليل رد الذكاء الاصطناعي' };
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
