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

    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: auth, error: userError } = await supabase.auth.getUser()
    if (userError || !auth?.user) return new Response('Unauthorized', { status: 401 })

    const { id } = await req.json()
    if (!id || typeof id !== 'string') {
      return new Response('Missing id', { status: 400, headers: corsHeaders })
    }

    const { error } = await supabase
      .from('solves')
      .delete()
      .eq('id', id)
      .eq('user_id', auth.user.id)

    if (error) return new Response(error.message, { status: 400, headers: corsHeaders })
    return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json', ...corsHeaders } })
  } catch (e: any) {
    return new Response(e?.message ?? 'Bad Request', { status: 400, headers: corsHeaders })
  }
})



