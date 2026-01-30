import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface VerifyRequest {
  imageBase64: string;
  claimedLevel: number;
  claimedUserId: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, claimedLevel, claimedUserId }: VerifyRequest = await req.json();

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ is_valid: false, error: 'الصورة مطلوبة' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use Lovable AI for image analysis
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ is_valid: false, error: 'خدمة التحقق غير متاحة حالياً' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const base64Data = imageBase64.includes(',') 
      ? imageBase64.split(',')[1] 
      : imageBase64;

    const prompt = `Analyze this Gala Live app profile screenshot.

Extract and return ONLY these values in JSON format:
1. user_id: The numeric user ID shown
2. username: The username if visible
3. recharge_level: Recharge level number (الشحن)
4. charm_level: Charm level number (السحر)  
5. support_level: Support level number (الدعم)
6. is_valid_profile: true if this is a valid Gala Live profile screenshot

Return ONLY valid JSON:
{
  "user_id": "123456789",
  "username": "name",
  "recharge_level": 50,
  "charm_level": 30,
  "support_level": 40,
  "is_valid_profile": true
}

If you cannot extract the data or it's not a valid profile screenshot, return:
{"is_valid_profile": false, "error": "reason"}`;

    const response = await fetch('https://api.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              {
                type: 'image_url',
                image_url: { url: `data:image/jpeg;base64,${base64Data}` },
              },
            ],
          },
        ],
        max_tokens: 500,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      console.error('Lovable API error:', await response.text());
      return new Response(
        JSON.stringify({ is_valid: false, error: 'خطأ في تحليل الصورة' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || '';
    
    console.log('AI Response:', content);

    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return new Response(
        JSON.stringify({ is_valid: false, error: 'لم نتمكن من تحليل الصورة' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const extracted = JSON.parse(jsonMatch[0]);

    if (!extracted.is_valid_profile) {
      return new Response(
        JSON.stringify({ 
          is_valid: false, 
          error: extracted.error || 'الصورة غير صالحة - يرجى رفع صورة من صفحة الملف الشخصي في غلا لايف' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate max level
    const rechargeLevel = parseInt(extracted.recharge_level) || 0;
    const charmLevel = parseInt(extracted.charm_level) || 0;
    const supportLevel = parseInt(extracted.support_level) || 0;
    const maxLevel = Math.max(rechargeLevel, charmLevel, supportLevel);

    // Return the verification result
    return new Response(
      JSON.stringify({
        is_valid: true,
        user_id: extracted.user_id,
        username: extracted.username,
        recharge_level: rechargeLevel,
        charm_level: charmLevel,
        support_level: supportLevel,
        max_level: maxLevel,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in verify-special-id-level:', error);
    return new Response(
      JSON.stringify({ is_valid: false, error: 'حدث خطأ أثناء التحقق' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
