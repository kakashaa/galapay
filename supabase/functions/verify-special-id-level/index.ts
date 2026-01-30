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

    // Updated prompt to specifically identify Gala Live "Me" page
    const prompt = `Analyze this Gala Live app screenshot and determine if it's from the "Me" (profile) page.

CRITICAL: This MUST be a screenshot from the Gala Live app's "Me" page which shows:
1. A bottom navigation bar with tabs: "Room", "Moment", "Message", "Me" - where "Me" should be highlighted/selected
2. A profile section at the top with username, ID, and avatar
3. Menu items like "Family", "Level", "Agency", "Salary Withdrawal", "Badges", "My Bag"
4. Small colored level badges/icons near the profile (these are the user's levels)

EXTRACT THE FOLLOWING:
1. user_id: The numeric ID shown (e.g., "ID: 1000" means user_id is "1000")
2. username: The username shown
3. level_badges: Look for small colored circular badges with numbers - these show the user's levels (e.g., green badge "39", gold badge "11", orange badge "35")
4. is_me_page: true ONLY if:
   - The bottom "Me" tab is visible and highlighted/selected
   - The page shows profile menu items (Family, Level, Agency, Badges, etc.)
   - This is clearly the user's own profile page

Return ONLY valid JSON:
{
  "user_id": "1000",
  "username": "name",
  "level_badge_1": 39,
  "level_badge_2": 11,
  "level_badge_3": 35,
  "is_me_page": true,
  "detected_elements": ["username", "id", "level_badges", "me_tab", "menu_items"]
}

If this is NOT a valid Gala Live "Me" page screenshot, return:
{
  "is_me_page": false,
  "error": "هذه ليست صورة من صفحة Me في غلا لايف. يرجى رفع صورة من صفحة الحساب الشخصي (Me)"
}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
        max_tokens: 800,
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

    // CRITICAL: Verify this is a "Me" page screenshot
    if (!extracted.is_me_page) {
      return new Response(
        JSON.stringify({ 
          is_valid: false, 
          error: extracted.error || 'هذه ليست صورة من صفحة Me في غلا لايف. يرجى رفع صورة من صفحة الحساب الشخصي (تبويب Me في الأسفل)' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract all level badges and find the maximum
    const levelBadge1 = parseInt(extracted.level_badge_1) || 0;
    const levelBadge2 = parseInt(extracted.level_badge_2) || 0;
    const levelBadge3 = parseInt(extracted.level_badge_3) || 0;
    
    // Get all non-zero levels
    const allLevels = [levelBadge1, levelBadge2, levelBadge3].filter(l => l > 0);
    const maxLevel = Math.max(...allLevels, 0);

    console.log('Extracted levels:', { levelBadge1, levelBadge2, levelBadge3, maxLevel });

    // Check if at least one level is >= 30
    const isEligible = maxLevel >= 30;

    if (!isEligible) {
      return new Response(
        JSON.stringify({ 
          is_valid: false, 
          error: `❌ مستواك (${maxLevel}) أقل من 30. يجب أن يكون أحد مستوياتك 30 أو أعلى للتأهل`,
          max_level: maxLevel,
          all_levels: allLevels
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Return the verification result with all level information
    return new Response(
      JSON.stringify({
        is_valid: true,
        user_id: extracted.user_id,
        username: extracted.username,
        level_badge_1: levelBadge1,
        level_badge_2: levelBadge2,
        level_badge_3: levelBadge3,
        max_level: maxLevel,
        all_levels: allLevels,
        is_me_page: true,
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