import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

interface DashboardQuery {
  action: 'stats' | 'recent' | 'search' | 'track' | 'health';
  service_type?: 'payout' | 'instant' | 'ban_report' | 'special_id' | 'coins' | 'all';
  tracking_code?: string;
  gala_id?: string;
  limit?: number;
  period?: 'today' | 'week' | 'month' | 'all';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Handle both GET and POST
    let query: DashboardQuery;
    
    if (req.method === 'GET') {
      const url = new URL(req.url);
      query = {
        action: (url.searchParams.get('action') as DashboardQuery['action']) || 'stats',
        service_type: (url.searchParams.get('service_type') as DashboardQuery['service_type']) || 'all',
        tracking_code: url.searchParams.get('tracking_code') || undefined,
        gala_id: url.searchParams.get('gala_id') || undefined,
        limit: parseInt(url.searchParams.get('limit') || '10'),
        period: (url.searchParams.get('period') as DashboardQuery['period']) || 'today',
      };
    } else {
      const contentType = req.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        return new Response(
          JSON.stringify({ success: false, error: 'Content-Type must be application/json' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const rawBody = await req.text();
      if (!rawBody || rawBody.trim() === '') {
        query = { action: 'stats', service_type: 'all', period: 'today' };
      } else {
        query = JSON.parse(rawBody);
      }
    }

    const { action, service_type, tracking_code, gala_id, limit = 10, period = 'today' } = query;

    // Calculate date range based on period
    const now = new Date();
    let startDate: Date;
    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      default:
        startDate = new Date(0); // All time
    }

    let result: Record<string, unknown>;

    switch (action) {
      case 'health': {
        result = {
          success: true,
          status: 'operational',
          timestamp: new Date().toISOString(),
          services: {
            payout: 'active',
            instant: 'active',
            ban_report: 'active',
            special_id: 'active',
            coins: 'active',
          }
        };
        break;
      }

      case 'stats': {
        const stats: Record<string, unknown> = {};

        // Payout requests stats
        if (service_type === 'all' || service_type === 'payout') {
          const { data: payoutStats } = await supabase
            .from('payout_requests')
            .select('status, amount')
            .is('deleted_at', null)
            .gte('created_at', startDate.toISOString());

          stats.payout = {
            total: payoutStats?.length || 0,
            pending: payoutStats?.filter(r => r.status === 'pending').length || 0,
            review: payoutStats?.filter(r => r.status === 'review').length || 0,
            paid: payoutStats?.filter(r => r.status === 'paid').length || 0,
            rejected: payoutStats?.filter(r => r.status === 'rejected').length || 0,
            reserved: payoutStats?.filter(r => r.status === 'reserved').length || 0,
            total_amount_usd: payoutStats?.reduce((sum, r) => sum + Number(r.amount), 0) || 0,
          };
        }

        // Instant payout stats
        if (service_type === 'all' || service_type === 'instant') {
          const { data: instantStats } = await supabase
            .from('instant_payout_requests')
            .select('status, supporter_amount_usd')
            .is('deleted_at', null)
            .gte('created_at', startDate.toISOString());

          stats.instant = {
            total: instantStats?.length || 0,
            pending: instantStats?.filter(r => r.status === 'pending').length || 0,
            processing: instantStats?.filter(r => r.status === 'processing').length || 0,
            completed: instantStats?.filter(r => r.status === 'completed').length || 0,
            rejected: instantStats?.filter(r => r.status === 'rejected').length || 0,
            total_amount_usd: instantStats?.reduce((sum, r) => sum + Number(r.supporter_amount_usd), 0) || 0,
          };
        }

        // Ban reports stats
        if (service_type === 'all' || service_type === 'ban_report') {
          const { data: banStats } = await supabase
            .from('ban_reports')
            .select('is_verified, ban_type')
            .is('deleted_at', null)
            .gte('created_at', startDate.toISOString());

          stats.ban_reports = {
            total: banStats?.length || 0,
            verified: banStats?.filter(r => r.is_verified).length || 0,
            pending: banStats?.filter(r => !r.is_verified).length || 0,
            by_type: {
              promotion: banStats?.filter(r => r.ban_type === 'promotion').length || 0,
              insult: banStats?.filter(r => r.ban_type === 'insult').length || 0,
              defamation: banStats?.filter(r => r.ban_type === 'defamation').length || 0,
            }
          };
        }

        // Special ID stats
        if (service_type === 'all' || service_type === 'special_id') {
          const { data: specialStats } = await supabase
            .from('special_id_requests')
            .select('status')
            .is('deleted_at', null)
            .gte('created_at', startDate.toISOString());

          stats.special_id = {
            total: specialStats?.length || 0,
            pending: specialStats?.filter(r => r.status === 'pending').length || 0,
            approved: specialStats?.filter(r => r.status === 'approved').length || 0,
            rejected: specialStats?.filter(r => r.status === 'rejected').length || 0,
          };
        }

        // Coins stats
        if (service_type === 'all' || service_type === 'coins') {
          const { data: coinsStats } = await supabase
            .from('coins_payout_requests')
            .select('status, amount_usd, coins_amount')
            .gte('created_at', startDate.toISOString());

          stats.coins = {
            total: coinsStats?.length || 0,
            pending: coinsStats?.filter(r => r.status === 'pending').length || 0,
            completed: coinsStats?.filter(r => r.status === 'completed').length || 0,
            rejected: coinsStats?.filter(r => r.status === 'rejected').length || 0,
            total_coins: coinsStats?.reduce((sum, r) => sum + Number(r.coins_amount), 0) || 0,
            total_amount_usd: coinsStats?.reduce((sum, r) => sum + Number(r.amount_usd), 0) || 0,
          };
        }

        result = { success: true, period, stats };
        break;
      }

      case 'recent': {
        const recentData: Record<string, unknown[]> = {};
        const safeLimit = Math.min(limit, 50);

        if (service_type === 'all' || service_type === 'payout') {
          const { data } = await supabase
            .from('payout_requests')
            .select('tracking_code, zalal_life_account_id, amount, status, country, payout_method, created_at')
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
            .limit(safeLimit);
          recentData.payout = data || [];
        }

        if (service_type === 'all' || service_type === 'instant') {
          const { data } = await supabase
            .from('instant_payout_requests')
            .select('tracking_code, supporter_name, supporter_account_id, host_name, host_account_id, supporter_amount_usd, status, created_at')
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
            .limit(safeLimit);
          recentData.instant = data || [];
        }

        if (service_type === 'all' || service_type === 'ban_report') {
          const { data } = await supabase
            .from('ban_reports')
            .select('id, reporter_gala_id, reported_user_id, ban_type, is_verified, created_at')
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
            .limit(safeLimit);
          recentData.ban_reports = data || [];
        }

        if (service_type === 'all' || service_type === 'special_id') {
          const { data } = await supabase
            .from('special_id_requests')
            .select('id, gala_user_id, user_level, digit_length, pattern_code, status, created_at')
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
            .limit(safeLimit);
          recentData.special_id = data || [];
        }

        if (service_type === 'all' || service_type === 'coins') {
          const { data } = await supabase
            .from('coins_payout_requests')
            .select('tracking_code, gala_account_id, coins_amount, amount_usd, status, created_at')
            .order('created_at', { ascending: false })
            .limit(safeLimit);
          recentData.coins = data || [];
        }

        result = { success: true, recent: recentData };
        break;
      }

      case 'track': {
        if (!tracking_code) {
          return new Response(
            JSON.stringify({ success: false, error: 'tracking_code مطلوب' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        let request = null;
        let requestType = '';

        // Search in payout_requests
        const { data: payoutReq } = await supabase
          .from('payout_requests')
          .select('*')
          .eq('tracking_code', tracking_code)
          .is('deleted_at', null)
          .maybeSingle();

        if (payoutReq) {
          request = payoutReq;
          requestType = 'payout';
        }

        // Search in instant_payout_requests
        if (!request) {
          const { data: instantReq } = await supabase
            .from('instant_payout_requests')
            .select('*')
            .eq('tracking_code', tracking_code)
            .is('deleted_at', null)
            .maybeSingle();

          if (instantReq) {
            request = instantReq;
            requestType = 'instant';
          }
        }

        // Search in coins_payout_requests
        if (!request) {
          const { data: coinsReq } = await supabase
            .from('coins_payout_requests')
            .select('*')
            .eq('tracking_code', tracking_code)
            .maybeSingle();

          if (coinsReq) {
            request = coinsReq;
            requestType = 'coins';
          }
        }

        if (!request) {
          result = { success: false, error: 'لم يتم العثور على طلب بهذا الكود' };
        } else {
          result = { success: true, type: requestType, request };
        }
        break;
      }

      case 'search': {
        if (!gala_id) {
          return new Response(
            JSON.stringify({ success: false, error: 'gala_id مطلوب للبحث' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const searchResults: Record<string, unknown[]> = {};

        // Search payout requests
        const { data: payoutResults } = await supabase
          .from('payout_requests')
          .select('tracking_code, amount, status, country, payout_method, created_at')
          .eq('zalal_life_account_id', gala_id)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(20);
        searchResults.payout = payoutResults || [];

        // Search instant requests (as supporter or host)
        const { data: instantSupporter } = await supabase
          .from('instant_payout_requests')
          .select('tracking_code, supporter_amount_usd, host_name, status, created_at')
          .eq('supporter_account_id', gala_id)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(20);

        const { data: instantHost } = await supabase
          .from('instant_payout_requests')
          .select('tracking_code, host_payout_amount, supporter_name, status, created_at')
          .eq('host_account_id', gala_id)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(20);

        searchResults.instant_as_supporter = instantSupporter || [];
        searchResults.instant_as_host = instantHost || [];

        // Search special ID requests
        const { data: specialResults } = await supabase
          .from('special_id_requests')
          .select('id, user_level, digit_length, pattern_code, status, created_at')
          .eq('gala_user_id', gala_id)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(20);
        searchResults.special_id = specialResults || [];

        // Search coins requests
        const { data: coinsResults } = await supabase
          .from('coins_payout_requests')
          .select('tracking_code, coins_amount, amount_usd, status, created_at')
          .eq('gala_account_id', gala_id)
          .order('created_at', { ascending: false })
          .limit(20);
        searchResults.coins = coinsResults || [];

        result = { success: true, gala_id, requests: searchResults };
        break;
      }

      default:
        result = { 
          success: false, 
          error: 'الإجراء غير معروف',
          available_actions: ['health', 'stats', 'recent', 'track', 'search']
        };
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Dashboard error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'حدث خطأ غير متوقع' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
