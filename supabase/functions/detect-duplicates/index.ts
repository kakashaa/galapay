import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface PayoutRequest {
  id: string;
  tracking_code: string;
  zalal_life_account_id: string;
  zalal_life_username: string | null;
  recipient_full_name: string;
  amount: number;
  reference_number: string | null;
  user_receipt_image_url: string;
  status: string;
  created_at: string;
  country: string;
  payout_method: string;
}

interface DuplicateGroup {
  type: 'account_id' | 'reference_number' | 'similar_receipt';
  reason: string;
  requests: PayoutRequest[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch all requests (not just pending, but all to find patterns)
    const { data: requests, error } = await supabase
      .from("payout_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) throw error;

    const duplicateGroups: DuplicateGroup[] = [];

    // 1. Check for duplicate account IDs (more than 2 requests from same account)
    const accountIdMap = new Map<string, PayoutRequest[]>();
    for (const req of requests || []) {
      const id = req.zalal_life_account_id;
      if (!accountIdMap.has(id)) {
        accountIdMap.set(id, []);
      }
      accountIdMap.get(id)!.push(req);
    }

    for (const [accountId, reqs] of accountIdMap) {
      if (reqs.length >= 2) {
        duplicateGroups.push({
          type: 'account_id',
          reason: `تكرار الايدي ${accountId} - ${reqs.length} طلبات`,
          requests: reqs,
        });
      }
    }

    // 2. Check for duplicate reference numbers
    const refNumberMap = new Map<string, PayoutRequest[]>();
    for (const req of requests || []) {
      const refNum = req.reference_number;
      if (refNum && refNum.trim() !== '') {
        if (!refNumberMap.has(refNum)) {
          refNumberMap.set(refNum, []);
        }
        refNumberMap.get(refNum)!.push(req);
      }
    }

    for (const [refNum, reqs] of refNumberMap) {
      if (reqs.length >= 2) {
        duplicateGroups.push({
          type: 'reference_number',
          reason: `تكرار الرقم المرجعي ${refNum} - ${reqs.length} طلبات`,
          requests: reqs,
        });
      }
    }

    // 3. Use AI to analyze receipt images for similarity
    if (lovableApiKey && requests && requests.length > 0) {
      // Get pending/review requests for AI image analysis
      const pendingRequests = requests.filter(r => r.status === 'pending' || r.status === 'review');
      
      if (pendingRequests.length >= 2) {
        // Prepare image URLs for AI analysis
        const imageData = pendingRequests.slice(0, 20).map(r => ({
          id: r.id,
          tracking_code: r.tracking_code,
          image_url: r.user_receipt_image_url,
          zalal_life_account_id: r.zalal_life_account_id,
          amount: r.amount,
        }));

        try {
          const aiResponse = await fetch("https://api.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${lovableApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [
                {
                  role: "user",
                  content: [
                    {
                      type: "text",
                      text: `أنت محلل أمني متخصص في كشف الاحتيال. قم بتحليل الإيصالات التالية وحدد أي إيصالات متشابهة أو مشبوهة.

قواعد الفحص:
1. ابحث عن إيصالات متطابقة أو متشابهة جداً (نفس الصورة مع تعديلات بسيطة)
2. ابحث عن أنماط مشبوهة (مثل نفس الخط اليدوي، نفس التصميم، نفس الأرقام)
3. حدد أي إيصال يبدو مزيفاً أو معدلاً رقمياً

قائمة الإيصالات للتحليل:
${imageData.map((d, i) => `${i + 1}. ID: ${d.tracking_code}, المبلغ: $${d.amount}, الايدي: ${d.zalal_life_account_id}`).join('\n')}

قم بإرجاع النتيجة بصيغة JSON فقط:
{
  "suspicious_pairs": [
    {
      "tracking_codes": ["CODE1", "CODE2"],
      "reason": "سبب الاشتباه"
    }
  ],
  "suspicious_single": [
    {
      "tracking_code": "CODE",
      "reason": "سبب الاشتباه"
    }
  ]
}

إذا لم تجد أي شيء مشبوه، أرجع:
{"suspicious_pairs": [], "suspicious_single": []}`,
                    },
                    ...imageData.slice(0, 10).map(d => ({
                      type: "image_url" as const,
                      image_url: { url: d.image_url },
                    })),
                  ],
                },
              ],
              max_tokens: 2000,
            }),
          });

          if (aiResponse.ok) {
            const aiResult = await aiResponse.json();
            const content = aiResult.choices?.[0]?.message?.content || "";
            
            // Parse AI response
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              try {
                const parsed = JSON.parse(jsonMatch[0]);
                
                // Process suspicious pairs
                if (parsed.suspicious_pairs && Array.isArray(parsed.suspicious_pairs)) {
                  for (const pair of parsed.suspicious_pairs) {
                    const matchingRequests = pendingRequests.filter(r => 
                      pair.tracking_codes?.includes(r.tracking_code)
                    );
                    if (matchingRequests.length >= 2) {
                      duplicateGroups.push({
                        type: 'similar_receipt',
                        reason: `🤖 ${pair.reason || 'إيصالات متشابهة'}`,
                        requests: matchingRequests,
                      });
                    }
                  }
                }

                // Process suspicious single requests
                if (parsed.suspicious_single && Array.isArray(parsed.suspicious_single)) {
                  for (const single of parsed.suspicious_single) {
                    const matchingRequest = pendingRequests.find(r => 
                      r.tracking_code === single.tracking_code
                    );
                    if (matchingRequest) {
                      duplicateGroups.push({
                        type: 'similar_receipt',
                        reason: `🤖 ${single.reason || 'إيصال مشبوه'}`,
                        requests: [matchingRequest],
                      });
                    }
                  }
                }
              } catch (parseError) {
                console.error("Error parsing AI response:", parseError);
              }
            }
          }
        } catch (aiError) {
          console.error("AI analysis error:", aiError);
        }
      }
    }

    // Remove duplicate entries (same request appearing in multiple groups)
    const uniqueGroups: DuplicateGroup[] = [];
    const seenRequestSets = new Set<string>();

    for (const group of duplicateGroups) {
      const key = group.requests.map(r => r.id).sort().join('|') + '|' + group.type;
      if (!seenRequestSets.has(key)) {
        seenRequestSets.add(key);
        uniqueGroups.push(group);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        totalScanned: requests?.length || 0,
        duplicateGroups: uniqueGroups,
        summary: {
          accountIdDuplicates: uniqueGroups.filter(g => g.type === 'account_id').length,
          referenceNumberDuplicates: uniqueGroups.filter(g => g.type === 'reference_number').length,
          similarReceipts: uniqueGroups.filter(g => g.type === 'similar_receipt').length,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in detect-duplicates:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
