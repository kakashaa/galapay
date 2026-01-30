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
  type: 'account_id' | 'reference_number' | 'similar_receipt' | 'reference_mismatch';
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

    // Fetch all requests
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

    // 3. Use AI to check each receipt for reference number mismatch
    if (lovableApiKey && requests && requests.length > 0) {
      const pendingRequests = requests.filter(r => r.status === 'pending' || r.status === 'review');
      
      console.log(`Analyzing ${pendingRequests.length} pending requests for reference mismatches...`);
      
      // Analyze each request individually for reference mismatch
      for (const req of pendingRequests.slice(0, 15)) {
        try {
          console.log(`Checking request ${req.tracking_code}...`);
          
          // Fetch and convert image to base64
          const imageResponse = await fetch(req.user_receipt_image_url);
          if (!imageResponse.ok) {
            console.error(`Failed to fetch image for ${req.tracking_code}`);
            continue;
          }
          
          const imageBuffer = await imageResponse.arrayBuffer();
          const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));
          const mimeType = imageResponse.headers.get('content-type') || 'image/jpeg';

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
                      text: `استخرج البيانات من صورة الإيصال هذه.
                      
البيانات المدخلة من المستخدم:
- الرقم المرجعي: ${req.reference_number || 'غير متوفر'}
- المبلغ: $${req.amount}

استخرج من الصورة وقارن. أرجع JSON فقط بدون أي نص آخر:
{
  "extracted_reference": "الرقم المرجعي المستخرج من الصورة",
  "extracted_amount": المبلغ المستخرج كرقم,
  "reference_match": true إذا تطابق أو false إذا لم يتطابق,
  "amount_match": true إذا تطابق أو false إذا لم يتطابق,
  "is_fake": true إذا الإيصال يبدو مزيف أو معدل,
  "notes": "أي ملاحظات مهمة"
}`,
                    },
                    {
                      type: "image_url",
                      image_url: { url: `data:${mimeType};base64,${base64Image}` },
                    },
                  ],
                },
              ],
              max_tokens: 500,
            }),
          });

          if (aiResponse.ok) {
            const aiResult = await aiResponse.json();
            const content = aiResult.choices?.[0]?.message?.content || "";
            console.log(`AI response for ${req.tracking_code}:`, content);
            
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              try {
                const parsed = JSON.parse(jsonMatch[0]);
                
                // Check for reference number mismatch
                if (parsed.reference_match === false && parsed.extracted_reference) {
                  duplicateGroups.push({
                    type: 'reference_mismatch',
                    reason: `🔴 الرقم المرجعي غير متطابق! المدخل: ${req.reference_number || 'فارغ'} - في الصورة: ${parsed.extracted_reference}`,
                    requests: [req],
                  });
                }
                
                // Check for amount mismatch
                if (parsed.amount_match === false && parsed.extracted_amount) {
                  duplicateGroups.push({
                    type: 'similar_receipt',
                    reason: `🟠 المبلغ غير متطابق! المدخل: $${req.amount} - في الصورة: $${parsed.extracted_amount}`,
                    requests: [req],
                  });
                }
                
                // Check if receipt is suspicious/fake
                if (parsed.is_fake === true) {
                  duplicateGroups.push({
                    type: 'similar_receipt',
                    reason: `🤖 إيصال مشبوه: ${parsed.notes || 'يبدو مزيف أو معدل'}`,
                    requests: [req],
                  });
                }
              } catch (parseError) {
                console.error("Error parsing AI response for request:", req.tracking_code, parseError);
              }
            }
          } else {
            console.error(`AI request failed for ${req.tracking_code}:`, await aiResponse.text());
          }
        } catch (reqError) {
          console.error("Error analyzing request:", req.tracking_code, reqError);
        }
      }
    }

    // Remove duplicate entries
    const uniqueGroups: DuplicateGroup[] = [];
    const seenRequestSets = new Set<string>();

    for (const group of duplicateGroups) {
      const key = group.requests.map(r => r.id).sort().join('|') + '|' + group.type + '|' + group.reason;
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
          referenceMismatches: uniqueGroups.filter(g => g.type === 'reference_mismatch').length,
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
