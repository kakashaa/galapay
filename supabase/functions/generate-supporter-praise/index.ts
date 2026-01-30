import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { supporterId, supporterName, supporterHandle } = await req.json();

    if (!supporterId || !supporterName) {
      return new Response(
        JSON.stringify({ error: "supporterId and supporterName are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if supporter already has AI praise text
    const { data: supporter, error: fetchError } = await supabase
      .from("supporters")
      .select("ai_praise_text")
      .eq("id", supporterId)
      .single();

    if (fetchError) {
      throw new Error(`Failed to fetch supporter: ${fetchError.message}`);
    }

    // If already has praise text, return it
    if (supporter?.ai_praise_text) {
      return new Response(
        JSON.stringify({ praiseText: supporter.ai_praise_text, cached: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate new praise text using AI
    const prompt = `أنت كاتب محتوى عربي متخصص في كتابة رسائل الشكر والتقدير. اكتب نص مدح وشكر فريد وإبداعي للداعم "${supporterName}" (المعرف: @${supporterHandle}) لدعمه تطبيق غلا لايف.

المتطلبات:
- النص يجب أن يكون بالعربية الفصحى السهلة
- طول النص بين 100-150 كلمة
- استخدم أسلوب عاطفي ومؤثر
- اذكر اسم الداعم في النص
- تحدث عن أهمية دعمه للمجتمع والمضيفين
- استخدم بعض الإيموجي المناسبة (3-5 إيموجي فقط)
- لا تستخدم عبارات مكررة أو قوالب جاهزة
- اجعل النص شخصي وفريد

اكتب النص فقط بدون أي مقدمات أو تفسيرات.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "أنت كاتب محتوى عربي إبداعي متخصص في رسائل الشكر والتقدير." },
          { role: "user", content: prompt },
        ],
        max_tokens: 500,
        temperature: 0.9,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Failed to generate praise text");
    }

    const aiResponse = await response.json();
    const praiseText = aiResponse.choices?.[0]?.message?.content?.trim();

    if (!praiseText) {
      throw new Error("No praise text generated");
    }

    // Save the generated praise text to the database
    const { error: updateError } = await supabase
      .from("supporters")
      .update({ ai_praise_text: praiseText })
      .eq("id", supporterId);

    if (updateError) {
      console.error("Failed to save praise text:", updateError);
      // Still return the generated text even if save fails
    }

    return new Response(
      JSON.stringify({ praiseText, cached: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating supporter praise:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
