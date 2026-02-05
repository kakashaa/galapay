import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WebhookPayload {
  request_type: string;
  request_id: string;
  tracking_code?: string;
  name?: string;
  account_id?: string;
  amount?: number;
  currency?: string;
  created_at: string;
  additional_data?: Record<string, unknown>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: WebhookPayload = await req.json();

    // Get active webhook config
    const { data: config, error: configError } = await supabase
      .from('webhook_config')
      .select('*')
      .eq('is_active', true)
      .maybeSingle();

    if (configError) {
      console.error('Error fetching webhook config:', configError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch webhook config' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    if (!config) {
      console.log('No active webhook configured');
      return new Response(
        JSON.stringify({ success: true, message: 'No active webhook configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare webhook data
    const webhookData = {
      event_type: 'new_request',
      request_type: payload.request_type,
      request_id: payload.request_id,
      tracking_code: payload.tracking_code,
      data: {
        name: payload.name,
        account_id: payload.account_id,
        amount: payload.amount,
        currency: payload.currency,
        created_at: payload.created_at,
        ...payload.additional_data,
      },
      timestamp: new Date().toISOString(),
    };

    // Log the notification attempt
    const { data: logEntry, error: logError } = await supabase
      .from('notification_log')
      .insert({
        request_type: payload.request_type,
        request_id: payload.request_id,
        tracking_code: payload.tracking_code,
        payload: webhookData,
        status: 'sending',
      })
      .select('id')
      .single();

    if (logError) {
      console.error('Error creating log entry:', logError);
    }

    // Send webhook
    let response_code = 0;
    let response_body = '';
    let status = 'failed';
    let error_message = null;

    try {
      const webhookResponse = await fetch(config.webhook_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Secret': config.api_key,
        },
        body: JSON.stringify(webhookData),
      });

      response_code = webhookResponse.status;
      response_body = await webhookResponse.text();
      
      if (webhookResponse.ok) {
        status = 'success';
      } else {
        error_message = `HTTP ${response_code}: ${response_body}`;
      }
    } catch (fetchError) {
      error_message = fetchError.message;
      console.error('Webhook fetch error:', fetchError);
    }

    // Update log entry with result
    if (logEntry?.id) {
      await supabase
        .from('notification_log')
        .update({
          status,
          response_code,
          response_body: response_body.substring(0, 1000), // Limit response body size
          error_message,
        })
        .eq('id', logEntry.id);
    }

    return new Response(
      JSON.stringify({ 
        success: status === 'success', 
        status,
        response_code,
        error: error_message 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Webhook notification error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
