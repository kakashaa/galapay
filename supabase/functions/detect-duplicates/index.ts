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

const AI_ENDPOINT = 'https://ai.gateway.lovable.dev/v1/chat/completions';

function toBase64DataUrl(uint8Array: Uint8Array, contentType: string) {
  // Avoid `String.fromCharCode(...bytes)` which can blow the call stack on large images.
  let binary = '';
  for (let i = 0; i < uint8Array.length; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  const base64 = btoa(binary);
  return `data:${contentType};base64,${base64}`;
}

async function fetchImageAsDataUrl(imageUrl: string) {
  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) {
    throw new Error(`Failed to fetch image (${imageResponse.status})`);
  }

  const imageBuffer = await imageResponse.arrayBuffer();
  const uint8Array = new Uint8Array(imageBuffer);
  const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';

  // Safety guard: extremely large images make the function slow + memory heavy.
  // 6MB is a reasonable upper bound for this scan.
  const MAX_BYTES = 6 * 1024 * 1024;
  if (uint8Array.byteLength > MAX_BYTES) {
    throw new Error(`Image too large to analyze (${Math.round(uint8Array.byteLength / 1024 / 1024)}MB)`);
  }

  return toBase64DataUrl(uint8Array, contentType);
}

async function analyzeReferenceMismatch(params: {
  lovableApiKey: string;
  request: PayoutRequest;
}): Promise<{ extracted_reference?: string; reference_match?: boolean; extracted_amount?: number; amount_match?: boolean; is_fake?: boolean; notes?: string } | null> {
  const { lovableApiKey, request } = params;

  const imageDataUrl = await fetchImageAsDataUrl(request.user_receipt_image_url);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 18_000);

  const aiResponse = await fetch(AI_ENDPOINT, {
    method: 'POST',
    signal: controller.signal,
    headers: {
      Authorization: `Bearer ${lovableApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `استخرج البيانات من صورة الإيصال هذه.

البيانات المدخلة من المستخدم:
- الرقم المرجعي: ${request.reference_number || 'غير متوفر'}
- المبلغ: $${request.amount}

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
              type: 'image_url',
              image_url: { url: imageDataUrl },
            },
          ],
        },
      ],
      max_tokens: 500,
    }),
  }).finally(() => clearTimeout(timeoutId));

  if (!aiResponse.ok) {
    const errorText = await aiResponse.text();
    console.error(`AI request failed for ${request.tracking_code}:`, aiResponse.status, errorText);
    return null;
  }

  const aiResult = await aiResponse.json();
  const content = aiResult.choices?.[0]?.message?.content || '';

  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  try {
    return JSON.parse(jsonMatch[0]);
  } catch (e) {
    console.error('Error parsing AI response for request:', request.tracking_code, e);
    return null;
  }
}

async function runPool<T, R>(items: T[], concurrency: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  let i = 0;

  const runners = Array.from({ length: Math.max(1, concurrency) }, async () => {
    while (i < items.length) {
      const current = items[i++];
      try {
        results.push(await worker(current));
      } catch (e) {
        // Keep going even if one task fails
        console.error('Pool task failed:', e);
      }
    }
  });

  await Promise.all(runners);
  return results;
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
      const body = (() => {
        try {
          return req.method === 'POST' ? undefined : undefined;
        } catch {
          return undefined;
        }
      })();

      // NOTE: We already fetched requests; read optional scan options from request body if present.
      let scanLimit = 25;
      let concurrency = 3;
      try {
        const parsedBody = await req.json().catch(() => ({}));
        if (typeof parsedBody?.scanLimit === 'number') scanLimit = Math.max(1, Math.min(50, parsedBody.scanLimit));
        if (typeof parsedBody?.concurrency === 'number') concurrency = Math.max(1, Math.min(5, parsedBody.concurrency));
      } catch {
        // ignore
      }

      const pendingRequests = requests.filter(r => r.status === 'pending' || r.status === 'review');
      
      console.log(`Analyzing ${pendingRequests.length} pending requests for reference mismatches...`);

      const candidates = pendingRequests
        .filter(r => !!r.user_receipt_image_url)
        .slice(0, scanLimit);

      await runPool(candidates, concurrency, async (r) => {
        console.log(`Checking request ${r.tracking_code}...`);
        const parsed = await analyzeReferenceMismatch({ lovableApiKey, request: r });
        if (!parsed) return null;

        if (parsed.reference_match === false && parsed.extracted_reference) {
          duplicateGroups.push({
            type: 'reference_mismatch',
            reason: `🔴 الرقم المرجعي غير متطابق! المدخل: ${r.reference_number || 'فارغ'} - في الصورة: ${parsed.extracted_reference}`,
            requests: [r],
          });
        }

        if (parsed.amount_match === false && parsed.extracted_amount) {
          duplicateGroups.push({
            type: 'similar_receipt',
            reason: `🟠 المبلغ غير متطابق! المدخل: $${r.amount} - في الصورة: $${parsed.extracted_amount}`,
            requests: [r],
          });
        }

        if (parsed.is_fake === true) {
          duplicateGroups.push({
            type: 'similar_receipt',
            reason: `🤖 إيصال مشبوه: ${parsed.notes || 'يبدو مزيف أو معدل'}`,
            requests: [r],
          });
        }

        return null;
      });
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
