import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ADMIN_ACCOUNTS = [
  { username: 'جنجون', email: 'jnjun@ghala.admin', password: 'gnassaf11' },
  { username: 'بيسو', email: 'biso@ghala.admin', password: 'bsassaf11' },
  { username: 'ريلاكس', email: 'relax@ghala.admin', password: 'rxassaf11' },
]

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const results = []

    for (const account of ADMIN_ACCOUNTS) {
      // Create user
      const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
        email: account.email,
        password: account.password,
        email_confirm: true,
        user_metadata: { username: account.username }
      })

      if (userError) {
        if (userError.message.includes('already been registered')) {
          results.push({ username: account.username, status: 'already exists' })
          continue
        }
        results.push({ username: account.username, status: 'error', error: userError.message })
        continue
      }

      // Add admin role
      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .insert({ user_id: userData.user.id, role: 'admin' })

      if (roleError) {
        results.push({ username: account.username, status: 'user created, role error', error: roleError.message })
      } else {
        results.push({ username: account.username, status: 'success' })
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
