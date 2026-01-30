import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { supporterName } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`Generating thank you message for: ${supporterName}`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { 
            role: "system", 
            content: `أنت مساعد متخصص في كتابة رسائل شكر قصيرة وصادقة باللغة العربية لتطبيق "غلا لايف". 
اكتب رسالة شكر واحدة فقط (جملة أو جملتين) للداعم. 
الرسالة يجب أن تكون:
- قصيرة (أقل من 50 كلمة)
- صادقة ومعبرة
- تحتوي على إيموجي واحد أو اثنين كحد أقصى
- مخصصة للداعم بذكر اسمه أو بدون ذكره
لا تكرر نفس العبارات. كن مبدعاً.` 
          },
          { 
            role: "user", 
            content: `اكتب رسالة شكر قصيرة للداعم: ${supporterName}` 
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const thankYouText = data.choices?.[0]?.message?.content?.trim() || "شكرًا جزيلًا لدعمك لتطبيق غلا لايف 💚";

    console.log(`Generated message: ${thankYouText}`);

    return new Response(JSON.stringify({ thankYouText }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error generating thank you message:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error",
      thankYouText: "شكرًا جزيلًا لدعمك لتطبيق غلا لايف 💚"
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
