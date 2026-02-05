import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get API key from header
    const apiKey = req.headers.get('x-api-key');
    
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'API key required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Verify API key
    const { data: config, error: configError } = await supabase
      .from('webhook_config')
      .select('api_key')
      .eq('api_key', apiKey)
      .maybeSingle();

    if (configError || !config) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid API key' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Parse query parameters
    const url = new URL(req.url);
    const type = url.searchParams.get('type');
    const id = url.searchParams.get('id');
    const trackingCode = url.searchParams.get('tracking_code');

    if (!type) {
      return new Response(
        JSON.stringify({ success: false, error: 'Type parameter required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (!id && !trackingCode) {
      return new Response(
        JSON.stringify({ success: false, error: 'Either id or tracking_code parameter required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    let data = null;
    let error = null;

    // Fetch data based on type
    switch (type) {
      case 'payout':
      case 'payout_request':
        if (trackingCode) {
          const result = await supabase
            .from('payout_requests')
            .select('*')
            .eq('tracking_code', trackingCode)
            .maybeSingle();
          data = result.data;
          error = result.error;
        } else {
          const result = await supabase
            .from('payout_requests')
            .select('*')
            .eq('id', id)
            .maybeSingle();
          data = result.data;
          error = result.error;
        }
        break;

      case 'instant':
      case 'instant_payout':
        if (trackingCode) {
          const result = await supabase
            .from('instant_payout_requests')
            .select('*')
            .eq('tracking_code', trackingCode)
            .maybeSingle();
          data = result.data;
          error = result.error;
        } else {
          const result = await supabase
            .from('instant_payout_requests')
            .select('*')
            .eq('id', id)
            .maybeSingle();
          data = result.data;
          error = result.error;
        }
        break;

      case 'special_id':
        const specialResult = await supabase
          .from('special_id_requests')
          .select('*')
          .eq('id', id)
          .maybeSingle();
        data = specialResult.data;
        error = specialResult.error;
        break;

      case 'ban':
      case 'ban_report':
        const banResult = await supabase
          .from('ban_reports')
          .select('*')
          .eq('id', id)
          .maybeSingle();
        data = banResult.data;
        error = banResult.error;
        break;

      case 'coins':
      case 'coins_payout':
        if (trackingCode) {
          const result = await supabase
            .from('coins_payout_requests')
            .select('*')
            .eq('tracking_code', trackingCode)
            .maybeSingle();
          data = result.data;
          error = result.error;
        } else {
          const result = await supabase
            .from('coins_payout_requests')
            .select('*')
            .eq('id', id)
            .maybeSingle();
          data = result.data;
          error = result.error;
        }
        break;

      default:
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Invalid type. Valid types: payout, instant, special_id, ban, coins' 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
    }

    if (error) {
      console.error('Database query error:', error);
      return new Response(
        JSON.stringify({ success: false, error: 'Database error' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    if (!data) {
      return new Response(
        JSON.stringify({ success: false, error: 'Not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    return new Response(
      JSON.stringify({ success: true, data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Lookup error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
