import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface ExtractionResult {
  success: boolean;
  referenceNumber?: string;
  amount?: number;
  userId?: string;
  userName?: string;
  notes?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { imageUrl, imageBase64: providedBase64 } = body;
    
    if (!imageUrl && !providedBase64) {
      return new Response(
        JSON.stringify({ success: false, notes: 'لم يتم توفير صورة الإيصال' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      console.log('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, notes: 'خدمة الاستخراج غير متاحة' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use provided base64 or fetch from URL
    let imageBase64: string;
    
    if (providedBase64) {
      // Use the provided base64 directly
      imageBase64 = providedBase64;
      console.log('Using provided base64 image');
    } else if (imageUrl) {
      // Fetch the image and convert to base64
      try {
        console.log('Fetching image from:', imageUrl);
        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) {
          console.error('Failed to fetch image:', imageResponse.status);
          return new Response(
            JSON.stringify({ success: false, notes: 'فشل في تحميل صورة الإيصال' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const imageBuffer = await imageResponse.arrayBuffer();
        const uint8Array = new Uint8Array(imageBuffer);
        
        let binary = '';
        for (let i = 0; i < uint8Array.length; i++) {
          binary += String.fromCharCode(uint8Array[i]);
        }
        imageBase64 = btoa(binary);
        
        const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
        imageBase64 = `data:${contentType};base64,${imageBase64}`;
        console.log('Image converted to base64 successfully');
      } catch (fetchError) {
        console.error('Error fetching image:', fetchError);
        return new Response(
          JSON.stringify({ success: false, notes: 'خطأ في معالجة صورة الإيصال' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      return new Response(
        JSON.stringify({ success: false, notes: 'لم يتم توفير صورة صالحة' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call AI to extract data from the receipt
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
            content: `أنت مساعد ذكاء اصطناعي متخصص في قراءة واستخراج البيانات من إيصالات التحويل.

مهمتك استخراج البيانات التالية من صورة الإيصال:
1. الرقم المرجعي (Reference Number / رقم العملية / Transaction ID / رقم المرجع)
2. المبلغ المحول بالدولار
3. معرف المستخدم (User ID)
4. اسم المستخدم (User Name)

يجب أن ترد بـ JSON فقط بهذا الشكل (بدون أي نص آخر):
{
  "referenceNumber": "الرقم المرجعي المستخرج أو null إذا لم يوجد",
  "amount": الرقم المستخرج أو null,
  "userId": "معرف المستخدم المستخرج أو null",
  "userName": "اسم المستخدم المستخرج أو null"
}

مهم جداً:
- استخرج الرقم المرجعي بالضبط كما هو في الإيصال
- لا تخترع أرقام غير موجودة
- إذا لم تجد بيانات معينة، اكتب null`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'استخرج البيانات من هذا الإيصال: الرقم المرجعي، المبلغ، معرف المستخدم، واسم المستخدم'
              },
              {
                type: 'image_url',
                image_url: { url: imageBase64 }
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
        JSON.stringify({ success: false, notes: 'خدمة الاستخراج غير متاحة مؤقتاً' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResult = await response.json();
    console.log('AI Raw Response:', JSON.stringify(aiResult));
    const content = aiResult.choices?.[0]?.message?.content || '';
    
    console.log('AI Content:', content);
    
    if (!content || content.trim() === '') {
      console.log('Empty AI response');
      return new Response(
        JSON.stringify({ success: false, notes: 'لم يتمكن من قراءة الإيصال' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Parse the AI response
    let extractionResult: ExtractionResult = { success: false, notes: 'فشل في تحليل البيانات' };
    
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        extractionResult = {
          success: true,
          referenceNumber: parsed.referenceNumber || undefined,
          amount: parsed.amount || undefined,
          userId: parsed.userId || undefined,
          userName: parsed.userName || undefined,
          notes: 'تم استخراج البيانات بنجاح'
        };
        console.log('Extracted data:', JSON.stringify(extractionResult));
      }
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      extractionResult = { success: false, notes: 'خطأ في تحليل البيانات المستخرجة' };
    }

    return new Response(
      JSON.stringify(extractionResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in extract-receipt-data:', error);
    return new Response(
      JSON.stringify({ success: false, notes: 'حدث خطأ أثناء الاستخراج' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
