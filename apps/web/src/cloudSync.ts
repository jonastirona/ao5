import { supabase } from './lib/supabaseClient'
import type { SolveEntry } from './store'

export async function syncSolveToCloud(entry: SolveEntry) {
  try {
    console.log('[sync] Attempting to sync solve:', entry.id, 'Time:', entry.timeMs + 'ms')
    const { error } = await supabase.functions.invoke('add-solve', {
      body: {
        id: entry.id,
        time_ms: entry.timeMs,
        scramble: entry.scramble,
        puzzle: '3x3'
      }
    })
    if (error) {
      console.warn('[sync] add-solve error:', error)
      throw error
    } else {
      console.log('[sync] add-solve success for', entry.id)
    }
  } catch (error) {
    console.error('[sync] Failed to sync solve to cloud:', error)
    throw error
  }
}

export async function fetchCloudSolves(): Promise<SolveEntry[] | null> {
  try {
    const { data, error } = await supabase.functions.invoke('get-solves')
    if (error) return null
    if (!Array.isArray(data)) return null
    return data.map((row: any) => ({
      id: row.id,
      scramble: row.scramble,
      timeMs: row.time_ms,
      timestamp: new Date(row.created_at).getTime(),
      puzzleType: row.puzzle_type || '3x3',
      sessionId: row.session_id // Ensure sessionId is mapped
    })) as SolveEntry[]
  } catch {
    return null
  }
}

export interface CloudSession {
    id: string
    name: string
    puzzleType: string
}

export async function fetchCloudSessions(): Promise<CloudSession[] | null> {
    try {
        const { data, error } = await supabase.from('sessions').select('*')
        if (error) {
            console.error('[sync] fetchCloudSessions error:', error)
            return null
        }
        return data.map((row: any) => ({
            id: row.id,
            name: row.session_name,
            puzzleType: row.puzzle
        }))
    } catch (e) {
        console.error('[sync] fetchCloudSessions exception:', e)
        return null
    }
}

export async function deleteSolveFromCloud(id: string): Promise<boolean> {
  try {
    // Use direct DB call with RLS instead of Edge Function to avoid CORS/deployment issues
    const { error } = await supabase.from('solves').delete().eq('id', id)
    
    if (error) {
      console.warn('[sync] delete-solve error:', error)
      return false
    }
    return true
  } catch (error) {
    console.error('[sync] Failed to delete solve in cloud:', error)
    return false
  }
}


export async function updateCloudSession(id: string, name: string, puzzleType: string): Promise<boolean> {
    try {
        const { error } = await supabase.from('sessions').update({
            session_name: name,
            puzzle: puzzleType
        }).eq('id', id)

        if (error) {
            console.error('[sync] updateCloudSession error:', error)
            return false
        }
        return true
    } catch (e) {
        console.error('[sync] updateCloudSession exception:', e)
        return false
    }
}

export async function deleteCloudSession(id: string): Promise<boolean> {
    try {
        const { error } = await supabase.from('sessions').delete().eq('id', id)

        if (error) {
            console.error('[sync] deleteCloudSession error:', error)
            return false
        }
        return true
    } catch (e) {
        console.error('[sync] deleteCloudSession exception:', e)
        return false
    }
}
