import { supabase } from './lib/supabaseClient'
import type { SolveEntry } from './store'

/**
 * Syncs a single solve to the cloud via Supabase Edge Function.
 * @param entry The solve entry to sync
 */
export async function syncSolveToCloud(entry: SolveEntry) {
  try {
    console.log('[sync] Attempting to sync solve:', entry.id, 'Time:', entry.timeMs + 'ms')
    const { error } = await supabase.functions.invoke('add-solve', {
      body: {
        id: entry.id,
        time_ms: entry.timeMs,
        scramble: entry.scramble,
        puzzle: entry.puzzleType,
        session_id: entry.sessionId,
        penalty: entry.penalty === 'plus2' ? '+2' : entry.penalty === 'DNF' ? 'DNF' : 'none'
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

/**
 * Fetches all solves for the authenticated user from the cloud.
 * @returns List of solves or null if error
 */
export async function fetchCloudSolves(): Promise<SolveEntry[] | null> {
  try {
    const { data, error } = await supabase.functions.invoke('get-solves')
    if (error) return null
    if (!Array.isArray(data)) return null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data.map((row: any) => ({
      id: row.id,
      scramble: row.scramble,
      timeMs: row.time_ms,
      timestamp: new Date(row.created_at).getTime(),
      puzzleType: row.puzzle_type || '3x3',
      sessionId: row.session_id, // Ensure sessionId is mapped
      penalty: row.penalty === '+2' ? 'plus2' : row.penalty === 'DNF' ? 'DNF' : null
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

/**
 * Fetches all sessions for the authenticated user from the cloud.
 * @returns List of sessions or null if error
 */
export async function fetchCloudSessions(): Promise<CloudSession[] | null> {
    try {
        const { data, error } = await supabase.from('sessions').select('*')
        if (error) {
            console.error('[sync] fetchCloudSessions error:', error)
            return null
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

/**
 * Deletes a solve from the cloud.
 * @param id ID of the solve to delete
 * @returns True if successful, false otherwise
 */
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


/**
 * Updates a session's metadata in the cloud.
 * @param id Session ID
 * @param name New session name
 * @param puzzleType New puzzle type
 * @returns True if successful
 */
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

/**
 * Deletes a session from the cloud.
 * @param id Session ID
 * @returns True if successful
 */
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

/**
 * Updates the penalty for a solve in the cloud.
 * @param id Solve ID
 * @param penalty New penalty value
 * @returns True if successful
 */
export async function updateSolvePenaltyInCloud(id: string, penalty: "plus2" | "DNF" | null): Promise<boolean> {
    try {
        const dbPenalty = penalty === 'plus2' ? '+2' : penalty === 'DNF' ? 'DNF' : 'none'
        console.log('[sync] Updating penalty for solve:', id, 'to:', dbPenalty, '(app value:', penalty, ')')
        
        const { data, error } = await supabase.from('solves').update({
            penalty: dbPenalty
        }).eq('id', id).select()

        if (error) {
            console.error('[sync] updateSolvePenaltyInCloud error:', error)
            return false
        }
        
        console.log('[sync] updateSolvePenaltyInCloud success. Data:', data)
        return true
    } catch (e) {
        console.error('[sync] updateSolvePenaltyInCloud exception:', e)
        return false
    }
}


