import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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
    // Used for duplicate reference checks (same reference allowed only for same account)
    zalalLifeAccountId?: string;
    recipientName?: string;
    country?: string;
    payoutMethod?: string;
    phoneNumber?: string;
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

// Helper function to convert image URL to base64
async function fetchImageAsBase64(url: string): Promise<{ base64: string; mimeType: string } | null> {
  try {
    console.log('Fetching image from URL:', url);
    const response = await fetch(url);
    if (!response.ok) {
      console.error('Failed to fetch image:', response.status);
      return null;
    }
    
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const arrayBuffer = await response.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    
    // Convert to base64
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);
    
    console.log('Image fetched successfully, size:', bytes.byteLength, 'bytes');
    return { base64, mimeType: contentType };
  } catch (error) {
    console.error('Error fetching image:', error);
    return null;
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

    // Fetch image and convert to base64
    const imageData = await fetchImageAsBase64(imageUrl);
    if (!imageData) {
      return new Response(
        JSON.stringify({ status: 'fail', notes: 'لم نتمكن من تحميل الصورة. تأكد أن رابط الصورة صحيح وحاول مرة أخرى.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const base64ImageUrl = `data:${imageData.mimeType};base64,${imageData.base64}`;

    // Retry logic for AI validation
    let response: Response | null = null;
    let lastError: string = '';
    
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(`AI validation attempt ${attempt}`);
        
        response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
3. هل اسم المستخدم (User Name / اسم المستخدم) يحتوي على "غلا لايف" أو "Ghala Life" أو "غلا" أو "Ghala"؟
4. ما هو مبلغ التحويل (Transfer Amount / مبلغ التحويل) الظاهر في الإيصال؟
5. ما هو الرقم المرجعي (Reference Number / الرقم المرجعي) في الإيصال؟

المبلغ المتوقع من المستخدم: $${expectedAmount || 'غير محدد'}
الرقم المرجعي الذي أدخله المستخدم: ${expectedReferenceNumber || 'غير محدد'}

يجب أن ترد بـ JSON فقط بهذا الشكل (بدون أي نص آخر):
{
  "status": "pass" أو "fail",
  "notes": "شرح مختصر بالعربي",
  "extractedData": {
    "amount": الرقم المستخرج من الإيصال,
    "userId": "معرف المستخدم المستخرج",
    "userName": "اسم المستخدم المستخرج",
    "referenceNumber": "الرقم المرجعي المستخرج من الإيصال"
  }
}

قواعد القبول والرفض:
- إذا كان معرف المستخدم ليس 10000: ارفض وقل "معرف المستخدم يجب أن يكون 10000"
- إذا كان اسم المستخدم لا يحتوي على "غلا" أو "Ghala" بأي شكل: ارفض
- إذا كان المبلغ لا يطابق المبلغ المتوقع (مع تساهل ±1): ارفض
- إذا لم تكن الصورة إيصال تحويل واضح: ارفض
- إذا لم يظهر رقم مرجعي في الإيصال: ارفض
- مهم جداً: قارن الرقم المرجعي الذي أدخله المستخدم مع الرقم الظاهر في الإيصال - إذا لم يتطابقا: ارفض وقل "الرقم المرجعي المُدخل لا يتطابق مع الرقم في الإيصال"
- إذا كان كل شيء صحيح (معرف 10000 + اسم غلا + مبلغ صحيح + رقم مرجعي متطابق): اقبل بـ "pass"`
              },
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: `تحقق من هذا الإيصال. المبلغ المتوقع: $${expectedAmount || 'غير محدد'}. الرقم المرجعي المُدخل: ${expectedReferenceNumber || 'غير محدد'}. تأكد أن الرقم المرجعي المُدخل يتطابق مع الرقم الظاهر في الإيصال.`
                  },
                  {
                    type: 'image_url',
                    image_url: { url: base64ImageUrl }
                  }
                ]
              }
            ],
            max_tokens: 500,
          }),
        });

        if (response.ok) {
          break; // Success, exit retry loop
        }
        
        const errorText = await response.text();
        lastError = errorText;
        console.error(`AI API error attempt ${attempt}:`, response.status, errorText);
        
        // If it's a 400 error related to image, give specific message
        if (response.status === 400 && errorText.includes('image')) {
          return new Response(
            JSON.stringify({ 
              status: 'fail', 
              notes: 'لم نتمكن من قراءة الصورة. تأكد أن الصورة واضحة وبصيغة صحيحة (JPG, PNG) وحاول مرة أخرى.' 
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Wait before retry
        if (attempt < 2) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
      } catch (fetchError) {
        console.error(`Fetch error attempt ${attempt}:`, fetchError);
        lastError = String(fetchError);
        if (attempt < 2) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }

    if (!response || !response.ok) {
      console.error('All AI attempts failed:', lastError);
      return new Response(
        JSON.stringify({ status: 'fail', notes: 'فحص الذكاء الاصطناعي غير متاح مؤقتاً. حاول مرة أخرى بعد قليل.' }),
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

    // Check for duplicate reference number in database
    // STRICT: Reject ANY duplicate reference number regardless of account
    if (validationResult.status === 'pass' && expectedReferenceNumber) {
      const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
      const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      
      if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        
        // Check if this reference number exists in ANY previous request
        const { data: existingRequests, error: dbError } = await supabase
          .from('payout_requests')
          .select('id, tracking_code')
          .eq('reference_number', expectedReferenceNumber);
        
        if (dbError) {
          console.error('Database error checking duplicate:', dbError);
        } else if (existingRequests && existingRequests.length > 0) {
          console.log('Duplicate reference number found:', expectedReferenceNumber, 'in', existingRequests.length, 'requests');
          validationResult = {
            status: 'fail',
            notes: `هذا الطلب مرفوع مسبقاً. الرقم المرجعي "${expectedReferenceNumber}" مستخدم في طلب سابق.`,
            extractedData: validationResult.extractedData
          };
        }
      }
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
