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

  console.log('=== Extract Receipt Data - Request received ===');

  try {
    const body = await req.json();
    const { imageUrl, imageBase64: providedBase64, zoomedImageBase64 } = body;
    
    console.log('Request type:', providedBase64 ? 'base64' : imageUrl ? 'URL' : 'none');
    console.log('Base64 length:', providedBase64?.length || 0);
    console.log('Zoomed image provided:', !!zoomedImageBase64);
    
    if (!imageUrl && !providedBase64) {
      console.log('Error: No image provided');
      return new Response(
        JSON.stringify({ success: false, notes: 'لم يتم توفير صورة الإيصال' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      console.log('Error: LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, notes: 'خدمة الاستخراج غير متاحة' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Helper function to prepare base64 image
    const prepareBase64 = (base64: string): string => {
      if (!base64.startsWith('data:image/')) {
        if (base64.startsWith('/9j/')) {
          return `data:image/jpeg;base64,${base64}`;
        } else if (base64.startsWith('iVBOR')) {
          return `data:image/png;base64,${base64}`;
        }
      }
      return base64;
    };

    // Use provided base64 or fetch from URL
    let imageBase64: string;
    
    if (providedBase64) {
      imageBase64 = prepareBase64(providedBase64);
      console.log('Using provided base64 image, prefix:', imageBase64.substring(0, 30));
    } else if (imageUrl) {
      try {
        console.log('Fetching image from:', imageUrl);
        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) {
          console.error('Failed to fetch image:', imageResponse.status, imageResponse.statusText);
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
        console.log('Image converted to base64 successfully, type:', contentType);
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

    // Prepare zoomed image if provided
    let zoomedBase64: string | null = null;
    if (zoomedImageBase64) {
      zoomedBase64 = prepareBase64(zoomedImageBase64);
      console.log('Zoomed image prepared, size:', Math.round(zoomedBase64.length / 1024), 'KB');
    }
    
    console.log('Proceeding with AI extraction...');

    // Improved prompt for better extraction
    const systemPrompt = `أنت خبير في قراءة واستخراج البيانات من إيصالات التحويل المالي في تطبيقات الهواتف.

مهمتك: استخراج البيانات التالية من صورة الإيصال بدقة عالية:

1. **الرقم المرجعي** (أهم شيء!):
   - ابحث عن: Reference Number, رقم المرجع, رقم العملية, Transaction ID, Order ID, Ref No, رقم الطلب, Reference, Confirmation Number
   - عادة يكون رقم طويل (5-20 خانة) قد يحتوي على أرقام وأحرف
   - قد يظهر في أعلى أو أسفل الإيصال
   - انتبه: ليس رقم الهاتف وليس المبلغ

2. **المبلغ المحول**:
   - ابحث عن: Amount, المبلغ, القيمة, Total
   - استخرج الرقم فقط بدون العملة

3. **معرف المستخدم (ID)**:
   - ابحث عن: User ID, ID, الايدي, رقم المستخدم
   - عادة رقم قصير (4-8 أرقام)

4. **اسم المستخدم**:
   - ابحث عن: Username, اسم المستخدم, الاسم, To, إلى, Recipient
   - قد يكون بالعربي أو الإنجليزي

أجب بـ JSON فقط بهذا الشكل الدقيق:
{"referenceNumber":"القيمة أو null","amount":رقم أو null,"userId":"القيمة أو null","userName":"القيمة أو null"}

قواعد مهمة:
- اقرأ الصورة بعناية شديدة
- الرقم المرجعي هو الأولوية القصوى - ابحث عنه في كل مكان
- لا تخترع أي بيانات غير موجودة في الصورة
- إذا وجدت رقماً بجانب كلمة Reference أو رقم المرجع، فهذا هو الرقم المرجعي
- أجب بـ JSON فقط بدون أي نص إضافي`;

    // Build user message content with images
    const userContent: any[] = [
      {
        type: 'text',
        text: zoomedBase64 
          ? 'استخرج جميع البيانات من هذه الإيصالات. الصورة الأولى هي الإيصال كامل، والصورة الثانية هي تكبير للرقم المرجعي. ركز على الصورة المكبرة للحصول على الرقم المرجعي بدقة.'
          : 'استخرج جميع البيانات من هذا الإيصال. ركز بشكل خاص على الرقم المرجعي (Reference Number).'
      },
      {
        type: 'image_url',
        image_url: { url: imageBase64 }
      }
    ];

    // Add zoomed image if provided
    if (zoomedBase64) {
      userContent.push({
        type: 'image_url',
        image_url: { url: zoomedBase64 }
      });
      console.log('Including zoomed image in AI request');
    }

    // Try with primary model first
    let response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: userContent
          }
        ],
        max_tokens: 500,
        temperature: 0.1,
      }),
    });

    // If primary model fails, try backup model
    if (!response.ok) {
      console.log('Primary model failed, trying backup model...');
      response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-pro',
          messages: [
            {
              role: 'system',
              content: systemPrompt
            },
            {
              role: 'user',
              content: userContent
            }
          ],
          max_tokens: 500,
          temperature: 0.1,
        }),
      });
    }

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
      // Try to find JSON in the response
      const jsonMatch = content.match(/\{[\s\S]*?\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        // Clean up the reference number - remove any extra spaces or characters
        let refNum = parsed.referenceNumber;
        if (refNum && typeof refNum === 'string') {
          refNum = refNum.trim().replace(/\s+/g, '');
        }
        
        extractionResult = {
          success: true,
          referenceNumber: refNum || undefined,
          amount: parsed.amount ? Number(parsed.amount) : undefined,
          userId: parsed.userId ? String(parsed.userId).trim() : undefined,
          userName: parsed.userName ? String(parsed.userName).trim() : undefined,
          notes: refNum ? 'تم استخراج البيانات بنجاح' : 'تم استخراج بعض البيانات'
        };
        console.log('Extracted data:', JSON.stringify(extractionResult));
      }
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      
      // Try to extract reference number using regex as fallback
      const refPatterns = [
        /reference[:\s#]*([A-Za-z0-9]+)/i,
        /ref[:\s#]*([A-Za-z0-9]+)/i,
        /رقم المرجع[:\s]*([A-Za-z0-9]+)/,
        /رقم العملية[:\s]*([A-Za-z0-9]+)/,
        /transaction[:\s#]*([A-Za-z0-9]+)/i,
        /order[:\s#]*([A-Za-z0-9]+)/i,
      ];
      
      for (const pattern of refPatterns) {
        const match = content.match(pattern);
        if (match && match[1]) {
          extractionResult = {
            success: true,
            referenceNumber: match[1].trim(),
            notes: 'تم استخراج الرقم المرجعي'
          };
          console.log('Extracted reference via regex:', match[1]);
          break;
        }
      }
      
      if (!extractionResult.success) {
        extractionResult = { success: false, notes: 'خطأ في تحليل البيانات المستخرجة' };
      }
    }

    console.log('=== Final extraction result ===', JSON.stringify(extractionResult));
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
