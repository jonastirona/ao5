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
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: auth, error: userError } = await supabase.auth.getUser()
    if (userError || !auth?.user) return new Response('Unauthorized', { status: 401 })

    const url = new URL(req.url)
    const puzzle = url.searchParams.get('puzzle')
    const sessionId = url.searchParams.get('session_id')

    let query = supabase
      .from('solves')
      .select('*')
      .eq('user_id', auth.user.id)
      .order('created_at', { ascending: true })

    if (puzzle) query = query.eq('puzzle', puzzle)
    if (sessionId) query = query.eq('session_id', sessionId)

    const { data, error } = await query
    if (error) return new Response(error.message, { status: 400, headers: corsHeaders })

    return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json', ...corsHeaders } })
  } catch (e: any) {
    return new Response(e?.message ?? 'Bad Request', { status: 400, headers: corsHeaders })
  }
})


