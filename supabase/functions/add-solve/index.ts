// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    // User-scoped client (RLS as the user)
    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    // Service client (bypass RLS for one-time profile ensure)
    const admin = createClient(supabaseUrl, serviceKey)

    const {
      id,
      time_ms,
      scramble,
      puzzle,
      session_id,
    } = await req.json()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) return new Response('Unauthorized', { status: 401 })

    // Ensure a profile row exists (profiles.username is required + unique)
    const fallback = `user_${user.id.substring(0, 8)}`
    await admin.from('profiles').upsert({ id: user.id, username: fallback })

    let sessionId = session_id as string | undefined
    if (!sessionId) {
      // Ensure a default session exists per puzzle
      const { data: existing } = await supabase
        .from('sessions')
        .select('id')
        .eq('user_id', user.id)
        .eq('puzzle', puzzle)
        .limit(1)
        .maybeSingle()

      if (existing?.id) {
        sessionId = existing.id
      } else {
        const { data: created, error: sessErr } = await supabase
          .from('sessions')
          .insert({ user_id: user.id, puzzle, session_name: 'Default' })
          .select('id')
          .single()
        if (sessErr) return new Response(sessErr.message, { status: 400, headers: corsHeaders })
        sessionId = created.id
      }
    }

    const { error } = await supabase.from('solves').insert({
      id,
      user_id: user.id,
      session_id: sessionId,
      puzzle,
      time_ms,
      scramble,
    })

    if (error) return new Response(error.message, { status: 400, headers: corsHeaders })
    return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json', ...corsHeaders } })
  } catch (e: any) {
    return new Response(e?.message ?? 'Bad Request', { status: 400, headers: corsHeaders })
  }
})


