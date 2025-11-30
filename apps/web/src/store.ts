import { create } from 'zustand'
import { TimerStateMachine, type TimerState } from 'core'
import { generateScramble, type PuzzleType, SUPPORTED_EVENTS } from 'core'
import { calculateAverages, getBestAverage, type Solve } from 'core'
import { supabase } from './lib/supabaseClient'
import { syncSolveToCloud, deleteSolveFromCloud } from './cloudSync'

export interface SolveEntry extends Solve {
  id: string
  scramble: string
  timestamp: number
  puzzleType: PuzzleType
  sessionId?: string
}

export interface Session {
  id: string
  name: string
  puzzleType: PuzzleType
  solves: SolveEntry[]
}

interface StoreState {
  // Timer & Scramble
  scramble: string
  timerState: TimerState
  elapsedMs: number
  inspectionLeft: number | null
  timer: TimerStateMachine | null
  initialized: boolean
  listening: boolean
  scrambleHistory: string[]
  currentScrambleIndex: number
  isKeyHeld: boolean
  isTimerRunning: boolean
  
  // Sessions
  sessions: Session[]
  currentSessionId: string
  
  // Computed Stats (for current session)
  ao5: number | null
  ao12: number | null
  ao100: number | null
  best: number | null
  worst: number | null
  
  lastSolveWasPB: { types: ('single' | 'ao5' | 'ao12' | 'ao100')[], id: number } | null
  clearPBStatus: () => void
  
  // Actions
  init: () => Promise<void>
  startListening: () => void
  stop: () => Promise<void>
  reset: () => Promise<void>
  nextScramble: () => Promise<void>
  previousScramble: () => Promise<void>
  
  // Session Actions
  createSession: (name: string, puzzleType: PuzzleType) => void
  addSession: (session: Session) => void
  switchSession: (id: string) => void
  deleteSession: (id: string) => void
  renameSession: (id: string, name: string) => void
  
  // Solve Actions
  deleteSolve: (id: string) => void
  updateSolvePenalty: (id: string, penalty: "plus2" | "DNF" | null) => void

  hydrateSolves: (entries: SolveEntry[], cloudSessions?: { id: string, name: string, puzzleType: string }[]) => void // Legacy/Cloud hydration
  getAllSolves: () => SolveEntry[]
  clearSolves: () => void
  
  currentTheme: string
  setTheme: (theme: string) => void
  
  // Settings
  settings: Settings
  updateSettings: (settings: Partial<Settings>) => void
}

export interface Settings {
  inspectionEnabled: boolean
  inspectionDuration: number // ms
  showScrambleImage: boolean
  scrambleImageScale: number
  pbEffectsEnabled: boolean
}

const STORAGE_KEY = 'ao5.sessions.v2' // Bumped version for new schema

export const useStore = create<StoreState>((set, get) => ({
  scramble: '',
  timerState: 'idle',
  elapsedMs: 0,
  inspectionLeft: null,
  timer: null,
  initialized: false,
  listening: false,
  scrambleHistory: [],
  currentScrambleIndex: 0,
  isKeyHeld: false,
  isTimerRunning: false,
  
  sessions: [],
  currentSessionId: '',
  
  ao5: null,
  ao12: null,
  ao100: null,
  best: null,
  worst: null,
  
  lastSolveWasPB: null,
  clearPBStatus: () => set({ lastSolveWasPB: null }),

  init: async () => {
    if (get().initialized) return
    set({ initialized: true })
    
    // Load sessions
    let sessions: Session[] = []
    let currentSessionId = ''
    
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed.sessions)) {
            sessions = parsed.sessions
            currentSessionId = parsed.currentSessionId || sessions[0]?.id || ''
        }
      } else {
        // Migration from v1
        const v1Raw = localStorage.getItem('ao5.session.v1')
        if (v1Raw) {
            const parsed = JSON.parse(v1Raw)

            const defaultSession: Session = {
                id: crypto.randomUUID(),
                name: 'Main Session',
                puzzleType: '3x3',
                solves: parsed.solves || []
            }
            sessions = [defaultSession]
            currentSessionId = defaultSession.id
        }
      }
    } catch {
      // Ignore storage errors
    }

    // Ensure at least one session exists
    if (sessions.length === 0) {
        console.log('[store] No sessions found, creating default')
        const defaultSession: Session = {
            id: crypto.randomUUID(),
            name: '3x3 Session',
            puzzleType: '3x3',
            solves: []
        }
        sessions = [defaultSession]
        currentSessionId = defaultSession.id
    } else {
        // Migration: Convert old puzzle types to new format
        const TYPE_MIGRATION: Record<string, string> = {
            '333': '3x3', '222': '2x2', '444': '4x4', '555': '5x5', '666': '6x6', '777': '7x7',
            '333bf': '3x3_bld', '333fm': '3x3_fm', '333oh': '3x3_oh', 'minx': 'megaminx',
            'pyram': 'pyraminx', '444bf': '4x4_bld', '555bf': '5x5_bld', '333mbf': '3x3_mbld'
        }
        
        let migrated = false
        sessions = sessions.map(s => {
            const newType = TYPE_MIGRATION[s.puzzleType]
            if (newType) {
                migrated = true
                return {
                    ...s,
                    puzzleType: newType as PuzzleType,
                    solves: s.solves.map(solve => ({
                        ...solve,
                        puzzleType: (TYPE_MIGRATION[solve.puzzleType] || solve.puzzleType) as PuzzleType
                    }))
                }
            }
            return s
        })
        
        if (migrated) {
            console.log('[store] Migrated sessions to new puzzle types')
        }
        
        console.log('[store] Loaded sessions:', sessions.length, 'Current:', currentSessionId)
    }

    // Load settings
    let settings: Settings = { 
        inspectionEnabled: true, 
        inspectionDuration: 15000, 
        showScrambleImage: true, 
        scrambleImageScale: 1,
        pbEffectsEnabled: true
    }
    try {
        const rawSettings = localStorage.getItem('ao5.settings')
        if (rawSettings) {
            settings = { ...settings, ...JSON.parse(rawSettings) }
        }
    } catch {
        // Ignore storage errors
    }

    // Load settings from cloud if logged in
    try {
        const { data } = await supabase.auth.getSession()
        if (data.session?.user) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('preferences')
                .eq('id', data.session.user.id)
                .single()
            
            if (profile?.preferences) {
                settings = { ...settings, ...profile.preferences }
                // Update local storage to match cloud
                localStorage.setItem('ao5.settings', JSON.stringify(settings))
            }
        }
    } catch (e) {
        console.error('[store] Failed to load settings from cloud:', e)
    }

    set({ sessions, currentSessionId, settings })
    
    // Update stats for current session
    const currentSession = sessions.find(s => s.id === currentSessionId)
    if (currentSession) {
        const stats = calculateAverages(currentSession.solves)
        set({ ...stats })
    } else {
        console.warn('[store] Current session ID not found in sessions list')
        if (sessions.length > 0) {
            set({ currentSessionId: sessions[0].id })
        }
    }

    // Prepare initial scramble
    const puzzleType = currentSession?.puzzleType || '3x3'
    const scramble = await generateScramble(puzzleType)
    set({ 
      scramble, 
      scrambleHistory: [scramble],
      currentScrambleIndex: 0
    })

    // Create timer
    const timer = new TimerStateMachine({
      onStateChange: (st: TimerState) => {
        set({ timerState: st })
        if (st === 'timing') {
          set({ isTimerRunning: true, inspectionLeft: null })
        } else if (st === 'stopped' || st === 'idle') {
          set({ isTimerRunning: false })
        } else if (st === 'inspection') {
             // Ensure inspection UI is shown
             // This block is intentionally empty as the UI updates are handled by state change
        }
      },
      onTick: (ms: number) => set({ elapsedMs: ms }),
      onInspectionTick: (ms: number) => set({ inspectionLeft: Math.ceil(ms / 1000) }),
      onStop: (ms: number, penalty?: "plus2" | "DNF") => {
        const state = get()
        const session = state.sessions.find(s => s.id === state.currentSessionId)
        if (!session) return

        const entry: SolveEntry = {
          id: crypto.randomUUID(),
          scramble: state.scramble,
          timeMs: ms,
          timestamp: Date.now(),
          puzzleType: session.puzzleType,
          sessionId: session.id,
          penalty: penalty || null
        }

        const updatedSolves = [...session.solves, entry]
        const updatedSessions = state.sessions.map(s => 
            s.id === state.currentSessionId ? { ...s, solves: updatedSolves } : s
        )
        
        const stats = calculateAverages(updatedSolves)
        
        const pbTypes: ('single' | 'ao5' | 'ao12' | 'ao100')[] = []

            // Check for PBs
        // Check for PBs
        if (state.settings.pbEffectsEnabled) {
            // Calculate previous bests (excluding the new solve)
            const previousSolves = session.solves
            
            const bestAo5 = getBestAverage(previousSolves, 5)
            const bestAo12 = getBestAverage(previousSolves, 12)
            const bestAo100 = getBestAverage(previousSolves, 100)
            const oldBest = state.best // Single PB is tracked in state correctly usually, but let's be safe
            
            // Check single PB (lower is better, ignore nulls)
            if (typeof stats.best === 'number' && stats.best > 0 && (oldBest === null || stats.best < oldBest)) {
                pbTypes.push('single')
            }
            // Check averages
            if (typeof stats.ao5 === 'number' && stats.ao5 > 0 && stats.ao5 !== -1) {
                 if (bestAo5 === null || stats.ao5 < bestAo5) {
                     pbTypes.push('ao5')
                 }
            }
            
            if (typeof stats.ao12 === 'number' && stats.ao12 > 0 && stats.ao12 !== -1) {
                if (bestAo12 === null || stats.ao12 < bestAo12) {
                    pbTypes.push('ao12')
                }
            }
            
            if (typeof stats.ao100 === 'number' && stats.ao100 > 0 && stats.ao100 !== -1) {
                if (bestAo100 === null || stats.ao100 < bestAo100) {
                    pbTypes.push('ao100')
                }
            }
        }

        const updates: Partial<StoreState> = { sessions: updatedSessions, ...stats }
        if (pbTypes.length > 0) {
            updates.lastSolveWasPB = { types: pbTypes, id: Date.now() }
        }
        set(updates)
        
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ sessions: updatedSessions, currentSessionId: state.currentSessionId }))
        } catch {
          // Ignore storage errors
        }

        // Cloud sync
        void (async () => {
          try {
            const { data } = await supabase.auth.getSession()
            if (data.session?.user) {
              await syncSolveToCloud(entry)
            }
          } catch (error) {
            console.error('[store] Failed to sync solve:', error)
          }
        })()

        get().nextScramble()
        get().timer?.reset()
      }
    })
    timer.updateSettings({ inspectionDurationMs: settings.inspectionDuration })
    set({ timer })
  },

  startListening: () => {
    if (get().listening) return
    const timer = get().timer
    if (!timer) return
    
    const activeKeys = new Set<string>()
    
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
          // Prevent scrolling
          e.preventDefault()
      }
      
      if (!e.repeat) {
        if (e.code === 'Escape') {
            e.preventDefault()
            activeKeys.clear()
            set({ isKeyHeld: false })
            get().reset()
            return
        }
        activeKeys.add(e.code)
        set({ isKeyHeld: true })
      }
      
      // Let's stick to Space for timer control to avoid accidental starts while typing (if we add typing).
      if (e.code === 'Space') {
          const state = get()
          
          if (state.timerState === 'timing') {
              timer.handleKeyDown(e.code, { repeat: e.repeat })
              return
          }

          if (state.timerState === 'idle') {
              if (state.settings.inspectionEnabled) {
                  // Start inspection
                  timer.startInspection()
              } else {
                  // Go to ready
                  timer.handleKeyDown(e.code, { repeat: e.repeat })
              }
          } else if (state.timerState === 'inspection') {
               // In inspection, pressing space prepares for ready
               timer.handleKeyDown(e.code, { repeat: e.repeat })
          } else {
              // Ready or other states
              timer.handleKeyDown(e.code, { repeat: e.repeat })
          }
      }

      // Shortcuts
      if (e.altKey) {
          const state = get()
          const session = state.sessions.find(s => s.id === state.currentSessionId)
          if (session && session.solves.length > 0) {
              const lastSolve = session.solves[session.solves.length - 1]
              
              // Alt + 2: Toggle +2
              if (e.key === '2' || e.code === 'Digit2') {
                  e.preventDefault()
                  const newPenalty = lastSolve.penalty === 'plus2' ? null : 'plus2'
                  get().updateSolvePenalty(lastSolve.id, newPenalty)
              }
              
              // Alt + D: Toggle DNF
              if (e.code === 'KeyD') {
                  e.preventDefault()
                  const newPenalty = lastSolve.penalty === 'DNF' ? null : 'DNF'
                  get().updateSolvePenalty(lastSolve.id, newPenalty)
              }
              
              // Alt + Z: Delete last solve
              if (e.code === 'KeyZ') {
                  e.preventDefault()
                  if (confirm('Delete last solve?')) {
                      get().deleteSolve(lastSolve.id)
                  }
              }
          }
      }
    }
    
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
          timer.handleKeyUp(e.code)
      }
      activeKeys.delete(e.code)
      if (activeKeys.size === 0) {
        set({ isKeyHeld: false })
      }
    }
    
    window.addEventListener('keydown', onKeyDown, { capture: true, passive: false })
    window.addEventListener('keyup', onKeyUp, { capture: true, passive: false })
    set({ listening: true })
    
    // @ts-expect-error cleanup
    window.__ao5_cleanup = () => {
      window.removeEventListener('keydown', onKeyDown, { capture: true } as EventListenerOptions)
      window.removeEventListener('keyup', onKeyUp, { capture: true } as EventListenerOptions)
      set({ listening: false })
    }
  },

  stop: async () => {
    get().timer?.stop()
  },

  reset: async () => {
    get().timer?.reset()
    set({ elapsedMs: 0, inspectionLeft: null })
  },

  nextScramble: async () => {
    const state = get()
    const session = state.sessions.find(s => s.id === state.currentSessionId)
    const puzzleType = session?.puzzleType || '3x3'

    if (state.currentScrambleIndex === state.scrambleHistory.length - 1) {
      const newScramble = await generateScramble(puzzleType)
      const newHistory = [...state.scrambleHistory, newScramble]
      set({ 
        scramble: newScramble, 
        scrambleHistory: newHistory,
        currentScrambleIndex: newHistory.length - 1,
        timerState: 'idle' 
      })
    } else {
      const newIndex = state.currentScrambleIndex + 1
      set({ 
        scramble: state.scrambleHistory[newIndex],
        currentScrambleIndex: newIndex,
        timerState: 'idle' 
      })
    }
  },

  previousScramble: async () => {
    const state = get()
    if (state.currentScrambleIndex > 0) {
      const newIndex = state.currentScrambleIndex - 1
      set({ 
        scramble: state.scrambleHistory[newIndex],
        currentScrambleIndex: newIndex,
        timerState: 'idle' 
      })
    }
  },

  createSession: (name: string, puzzleType: PuzzleType) => {
      const state = get()
      const newSession: Session = {
          id: crypto.randomUUID(),
          name,
          puzzleType,
          solves: []
      }
      const sessions = [...state.sessions, newSession]
      set({ sessions, currentSessionId: newSession.id })
      // Update stats (empty)
      set({ ao5: null, ao12: null, ao100: null, best: null, worst: null })
      // Generate new scramble for new puzzle type
      get().nextScramble() // This might need to be forced to generate new
      
      // Actually nextScramble checks history. We should reset history for new session?
      // Or just generate a fresh one.
      void (async () => {
          const scramble = await generateScramble(puzzleType)
          set({ scramble, scrambleHistory: [scramble], currentScrambleIndex: 0 })
      })()

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ sessions, currentSessionId: newSession.id }))
      } catch {
        // Ignore storage errors
      }
  },

  addSession: (session: Session) => {
      const state = get()
      // Ensure unique ID just in case
      const newSession = { ...session, id: session.id || crypto.randomUUID() }
      const sessions = [...state.sessions, newSession]
      set({ sessions, currentSessionId: newSession.id })
      
      // Update stats
      const stats = calculateAverages(newSession.solves)
      set({ ...stats })
      
      // Generate scramble
      void (async () => {
          const scramble = await generateScramble(newSession.puzzleType)
          set({ scramble, scrambleHistory: [scramble], currentScrambleIndex: 0 })
      })()

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ sessions, currentSessionId: newSession.id }))
      } catch {
        // Ignore storage errors
      }

      // Sync imported solves to cloud
      void (async () => {
          try {
              const { data } = await supabase.auth.getSession()
              if (!data.session?.user) {
                  console.log('[store] Cannot sync imported solves: User not logged in')
                  return
              }
              
              // 1. Create Session in DB
              const { error: sessionError } = await supabase.from('sessions').upsert({
                  id: newSession.id,
                  user_id: data.session.user.id,
                  puzzle: newSession.puzzleType,
                  session_name: newSession.name,
                  created_at: new Date().toISOString()
              })

              if (sessionError) {
                  console.error('[store] Failed to sync session:', sessionError)
                  return
              }

              if (newSession.solves.length > 0) {
                  console.log('[store] Syncing imported session to cloud:', newSession.solves.length, 'solves')
                  
                  // Batch insert directly to DB for efficiency
                  const payload = newSession.solves.map(s => ({
                      id: s.id,
                      user_id: data.session!.user.id,
                      session_id: newSession.id,
                      time_ms: s.timeMs,
                      scramble: s.scramble,
                      puzzle: s.puzzleType,
                      penalty: s.penalty === 'plus2' ? '+2' : (s.penalty === 'DNF' ? 'DNF' : 'none'),
                      created_at: new Date(s.timestamp).toISOString()
                  }))

                  console.log('[store] Sync payload sample:', payload[0])

                  const { error } = await supabase.from('solves').upsert(payload)
                  if (error) {
                      console.error('[store] Failed to sync imported solves:', error)
                  } else {
                      console.log('[store] Successfully synced imported solves')
                  }
              }
          } catch (e) {
              console.error('[store] Error syncing imported solves:', e)
          }
      })()
  },

  switchSession: (id: string) => {
      console.log('[store] Switching session to:', id)
      const state = get()
      const session = state.sessions.find(s => s.id === id)
      if (!session) {
          console.warn('[store] Session not found:', id)
          return
      }
      
      set({ currentSessionId: id })
      const stats = calculateAverages(session.solves)
      set({ ...stats })
      
      // Generate scramble for this session's puzzle
      void (async () => {
          const scramble = await generateScramble(session.puzzleType)
          set({ scramble, scrambleHistory: [scramble], currentScrambleIndex: 0 })
      })()
      
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ sessions: state.sessions, currentSessionId: id }))
      } catch {
        // Ignore storage errors
      }
  },

  deleteSession: (id: string) => {
      const state = get()
      if (state.sessions.length <= 1) return // Cannot delete last session
      
      const newSessions = state.sessions.filter(s => s.id !== id)
      let newCurrentId = state.currentSessionId
      if (state.currentSessionId === id) {
          newCurrentId = newSessions[0].id
      }
      
      set({ sessions: newSessions, currentSessionId: newCurrentId })
      
      if (state.currentSessionId === id) {
          get().switchSession(newCurrentId)
      } else {
           try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ sessions: newSessions, currentSessionId: newCurrentId }))
          } catch {
            // Ignore storage errors
          }
      }

      // Sync delete to cloud
      import('./cloudSync').then(m => m.deleteCloudSession(id))
  },
  
  renameSession: (id: string, name: string) => {
      const state = get()
      const session = state.sessions.find(s => s.id === id)
      const sessions = state.sessions.map(s => s.id === id ? { ...s, name } : s)
      set({ sessions })
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ sessions, currentSessionId: state.currentSessionId }))
      } catch {
        // Ignore storage errors
      }

      // Sync update to cloud
      if (session) {
          import('./cloudSync').then(m => m.updateCloudSession(id, name, session.puzzleType))
      }
  },

  deleteSolve: (id: string) => {
    const state = get()
    const session = state.sessions.find(s => s.id === state.currentSessionId)
    if (!session) return

    const solves = session.solves.filter(s => s.id !== id)
    const sessions = state.sessions.map(s => 
        s.id === state.currentSessionId ? { ...s, solves } : s
    )
    
    const stats = calculateAverages(solves)
    set({ sessions, ...stats })
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ sessions, currentSessionId: state.currentSessionId }))
    } catch {
      // Ignore storage errors
    }

    void (async () => {
      try {
        const { data } = await supabase.auth.getSession()
        if (data.session?.user) {
          console.log('[store] Deleting solve from cloud:', id)
          const success = await deleteSolveFromCloud(id)
          if (success) {
              console.log('[store] Successfully deleted solve from cloud')
          } else {
              console.error('[store] Failed to delete solve from cloud (returned false)')
          }
        } else {
            console.log('[store] Not logged in, skipping cloud delete')
        }
      } catch (e) {
          console.error('[store] Error in deleteSolve cloud sync:', e)
      }
    })()
  },
  
  updateSolvePenalty: (id: string, penalty: "plus2" | "DNF" | null) => {
      const state = get()
      const session = state.sessions.find(s => s.id === state.currentSessionId)
      if (!session) return

      const solves = session.solves.map(s => s.id === id ? { ...s, penalty } : s)
      const sessions = state.sessions.map(s => 
        s.id === state.currentSessionId ? { ...s, solves } : s
      )
      
      const stats = calculateAverages(solves)
      set({ sessions, ...stats })
      
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ sessions, currentSessionId: state.currentSessionId }))
      } catch {
        // Ignore storage errors
      }
      
      // TODO: Sync penalty update to cloud
  },

  getAllSolves: () => {
      return get().sessions.flatMap(s => s.solves)
  },

  hydrateSolves: (entries: SolveEntry[], cloudSessions?: { id: string, name: string, puzzleType: string }[]) => {
    console.log('[store] Hydrating solves:', entries.length)
    const state = get()
    // Group entries by sessionId if available, otherwise fallback to puzzleType
    const bySession: Record<string, SolveEntry[]> = {}
    const byType: Record<string, SolveEntry[]> = {}
    
    entries.forEach(e => {
        if (e.sessionId) {
            if (!bySession[e.sessionId]) bySession[e.sessionId] = []
            bySession[e.sessionId].push(e)
        } else {
            const type = e.puzzleType || '333'
            if (!byType[type]) byType[type] = []
            byType[type].push(e)
        }
    })

    const newSessions = [...state.sessions]
    
    // 1. Handle solves with explicit sessionId
    Object.entries(bySession).forEach(([sessionId, solves]) => {
        const existingIndex = newSessions.findIndex(s => s.id === sessionId)
        const cloudSession = cloudSessions?.find(cs => cs.id === sessionId)
        
        if (existingIndex >= 0) {
             // Update existing session with cloud data if available
             const finalPuzzleType = cloudSession ? (cloudSession.puzzleType as PuzzleType) : newSessions[existingIndex].puzzleType
             newSessions[existingIndex] = {
                ...newSessions[existingIndex],
                name: cloudSession ? cloudSession.name : newSessions[existingIndex].name,
                puzzleType: finalPuzzleType,
                solves: solves.map(s => ({ ...s, puzzleType: finalPuzzleType })).sort((a, b) => a.timestamp - b.timestamp)
            }
        } else {
            // Create new session from cloud data
            const type = cloudSession?.puzzleType || solves[0]?.puzzleType || '333'
            const name = cloudSession?.name || `${SUPPORTED_EVENTS.find(e => e.id === type)?.name || type} (Cloud)`
            
            newSessions.push({
                id: sessionId,
                name,
                puzzleType: type as PuzzleType,
                solves: solves.map(s => ({ ...s, puzzleType: type as PuzzleType })).sort((a, b) => a.timestamp - b.timestamp)
            })
        }
    })

    // 2. Handle legacy/unlinked solves (fallback to type grouping)
    Object.entries(byType).forEach(([type, solves]) => {
        const existingSessionIndex = newSessions.findIndex(s => s.puzzleType === type)
        if (existingSessionIndex >= 0) {
             const currentSolves = newSessions[existingSessionIndex].solves
             const merged = [...currentSolves, ...solves].sort((a, b) => a.timestamp - b.timestamp)
             
             // Deduplicate by ID
             const unique = Array.from(new Map(merged.map(s => [s.id, s])).values())
             
             newSessions[existingSessionIndex] = {
                ...newSessions[existingSessionIndex],
                solves: unique
            }
        } else {
            newSessions.push({
                id: crypto.randomUUID(),
                name: `${SUPPORTED_EVENTS.find(e => e.id === type)?.name || type} Cloud`,
                puzzleType: type as PuzzleType,
                solves: solves.sort((a, b) => a.timestamp - b.timestamp)
            })
        }
    })
    
    // Update stats if current session was affected
    const currentSession = newSessions.find(s => s.id === state.currentSessionId)
    if (currentSession) {
        const stats = calculateAverages(currentSession.solves)
        set({ sessions: newSessions, ...stats })
    } else {
        // If current session is invalid (e.g. deleted or not found), switch to first available
        if (newSessions.length > 0) {
            set({ sessions: newSessions, currentSessionId: newSessions[0].id })
        } else {
             set({ sessions: newSessions })
        }
    }
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ sessions: newSessions, currentSessionId: state.currentSessionId }))
    } catch {
      // Ignore storage errors
    }
  },

  clearSolves: () => {
    const state = get()
    const sessions = state.sessions.map(s => ({ ...s, solves: [] }))
    set({ sessions, ao5: null, ao12: null, ao100: null, best: null, worst: null })
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ sessions, currentSessionId: state.currentSessionId }))
    } catch {
      // Ignore storage errors
    }
  },
  
  currentTheme: (() => {
    try {
      return localStorage.getItem('ao5.theme') || 'default'
    } catch {
      return 'default'
    }
  })(),
  setTheme: (theme: string) => {
      set({ currentTheme: theme })
      try {
          localStorage.setItem('ao5.theme', theme)
      } catch {
          // Ignore storage errors
      }
      
      // Sync to cloud if logged in
      void (async () => {
          try {
              const { data } = await supabase.auth.getSession()
              if (data.session?.user) {
                  await supabase.from('profiles').update({ theme }).eq('id', data.session.user.id)
              }
          } catch {
              // Ignore sync errors
          }
      })()
  },

  settings: {
      inspectionEnabled: true,
      inspectionDuration: 15000,
      showScrambleImage: true,
      scrambleImageScale: 1,
      pbEffectsEnabled: true
  },
  
  updateSettings: (newSettings: Partial<Settings>) => {
      const state = get()
      const updated = { ...state.settings, ...newSettings }
      
      // Update timer if needed
      if (newSettings.inspectionDuration) {
          state.timer?.updateSettings({ inspectionDurationMs: updated.inspectionDuration })
      }

      set({ settings: updated })
      
      try {
          localStorage.setItem('ao5.settings', JSON.stringify(updated))
      } catch {
          // Ignore storage errors
      }
      
      // Sync to cloud
      void (async () => {
          try {
              const { data } = await supabase.auth.getSession()
              if (data.session?.user) {
                  await supabase.from('profiles').update({ 
                      preferences: updated 
                  }).eq('id', data.session.user.id)
              }
          } catch (e) {
              console.error('[store] Failed to sync settings:', e)
          }
      })()
  }
}))
