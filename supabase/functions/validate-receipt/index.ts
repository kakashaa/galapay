import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl } = await req.json();
    
    if (!imageUrl) {
      return new Response(
        JSON.stringify({ status: 'pending', notes: 'No image URL provided' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      console.log('LOVABLE_API_KEY not configured, skipping AI validation');
      return new Response(
        JSON.stringify({ status: 'pending', notes: 'AI validation not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call AI to validate the receipt
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
            content: `You are an AI assistant that validates transfer receipts for Zalal Life payouts.
            
Your task is to analyze the receipt image and determine:
1. Is this a valid transfer/payment receipt (not a random photo)?
2. Does it appear to show a transfer to Agency ID 10000?

Respond with a JSON object ONLY (no other text):
{
  "status": "pass" or "fail",
  "notes": "Brief explanation in Arabic"
}

If the image clearly looks like a receipt and shows transfer to Agency 10000, status should be "pass".
If it's not a receipt or doesn't show Agency 10000, status should be "fail".
If unclear, default to "pass" to avoid blocking legitimate requests.`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Please validate this transfer receipt image. Check if it appears to be a legitimate transfer receipt to Agency ID 10000.'
              },
              {
                type: 'image_url',
                image_url: { url: imageUrl }
              }
            ]
          }
        ],
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      console.error('AI API error:', response.status);
      return new Response(
        JSON.stringify({ status: 'pending', notes: 'AI validation temporarily unavailable' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResult = await response.json();
    const content = aiResult.choices?.[0]?.message?.content || '';
    
    // Try to parse the AI response as JSON
    try {
      // Extract JSON from the response (it might have markdown code blocks)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return new Response(
          JSON.stringify({
            status: parsed.status === 'fail' ? 'fail' : 'pass',
            notes: parsed.notes || 'تم فحص الإيصال'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
    }

    // Default response if parsing fails
    return new Response(
      JSON.stringify({ status: 'pending', notes: 'لم يتم التحقق بشكل كامل' }),
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
