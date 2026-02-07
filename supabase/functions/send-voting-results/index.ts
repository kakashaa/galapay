import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { session_id } = await req.json();

    // Get session details
    const { data: session, error: sessionError } = await supabase
      .from('voting_sessions')
      .select('*')
      .eq('id', session_id)
      .single();

    if (sessionError || !session) {
      throw new Error('Session not found');
    }

    // Get vote counts
    const { data: voteCounts, error: voteError } = await supabase
      .rpc('get_session_vote_counts', { p_session_id: session_id });

    if (voteError) throw voteError;

    // Get game names
    const { data: games } = await supabase
      .from('voting_games')
      .select('id, name, name_arabic');

    const gamesMap = new Map((games || []).map(g => [g.id, g]));

    const results = (voteCounts || []).map((vc: { game_id: string; vote_count: number }, index: number) => {
      const game = gamesMap.get(vc.game_id);
      return {
        rank: index + 1,
        game_id: vc.game_id,
        game_name: game?.name || 'Unknown',
        game_name_arabic: game?.name_arabic || 'غير معروف',
        vote_count: Number(vc.vote_count)
      };
    });

    // Get webhook config
    const { data: webhookConfig } = await supabase
      .from('webhook_config')
      .select('*')
      .eq('is_active', true)
      .single();

    if (webhookConfig?.webhook_url) {
      const payload = {
        event_type: 'voting_results',
        session: {
          id: session.id,
          title: session.title,
          started_at: session.starts_at,
          ended_at: session.ends_at
        },
        results,
        top_4: results.slice(0, 4),
        total_votes: results.reduce((sum: number, r: { vote_count: number }) => sum + r.vote_count, 0),
        timestamp: new Date().toISOString()
      };

      // Send to webhook
      const response = await fetch(webhookConfig.webhook_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': webhookConfig.api_key
        },
        body: JSON.stringify(payload)
      });

      // Log the notification
      await supabase.from('notification_log').insert({
        request_type: 'voting_results',
        request_id: session_id,
        tracking_code: session.title,
        status: response.ok ? 'sent' : 'failed',
        response_code: response.status,
        payload
      });

      // Mark session as results sent
      await supabase
        .from('voting_sessions')
        .update({ results_sent: true })
        .eq('id', session_id);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        results,
        message: 'Voting results processed' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error processing voting results:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
