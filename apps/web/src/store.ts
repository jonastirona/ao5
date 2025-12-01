import { create } from 'zustand'
import { TimerStateMachine, type TimerState } from 'core'
import { generateScramble, type PuzzleType, SUPPORTED_EVENTS } from 'core'
import { calculateAverages, getBestAverage, type Solve } from 'core'
import { supabase } from './lib/supabaseClient'
import { syncSolveToCloud, deleteSolveFromCloud } from './cloudSync'
import { themes } from './themes'

export interface SolveEntry extends Solve {
  id: string
  scramble: string
  timestamp: number
  puzzleType: PuzzleType
  sessionId?: string
  synced?: boolean
}

export interface Session {
  id: string
  name: string
  puzzleType: PuzzleType
  solves: SolveEntry[]
}



export interface Settings {
  inspectionEnabled: boolean
  inspectionDuration: number // ms
  showScrambleImage: boolean
  scrambleImageScale: number
  scrambleVisualization3D: boolean
  pbEffectsEnabled: boolean
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
  guestSolveCount: number
  concurrentUsers: number
  
  // Computed Stats (for current session)
  ao5: number | null
  ao12: number | null
  ao100: number | null
  best: number | null
  worst: number | null
  
  lastSolveWasPB: { types: ('single' | 'ao5' | 'ao12' | 'ao100')[], id: string } | null
  clearPBStatus: () => void
  

  
  // Actions
  init: () => Promise<void>
  initPresence: () => void
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
  setSolveSynced: (id: string, synced: boolean) => void
  mergeSessionId: (oldId: string, newId: string) => void

  hydrateSolves: (entries: SolveEntry[], cloudSessions?: { id: string, name: string, puzzleType: string }[]) => void // Legacy/Cloud hydration
  getAllSolves: () => SolveEntry[]
  clearSolves: () => void
  
  currentTheme: string
  setTheme: (theme: string) => void
  
  // Settings
  settings: Settings
  updateSettings: (settings: Partial<Settings>) => void
}

const STORAGE_KEY = 'ao5_data'

export const useStore = create<StoreState>((set, get) => ({
  scramble: 'Loading...',
  timerState: 'idle',
  elapsedMs: 0,
  inspectionLeft: null,
  timer: null,
  initialized: false,
  listening: false,
  scrambleHistory: [],
  currentScrambleIndex: -1,
  isKeyHeld: false,
  isTimerRunning: false,
  
  sessions: [],
  currentSessionId: '',
  guestSolveCount: 0,
  concurrentUsers: 0,
  
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
            // Prefer last used session ID if available, otherwise fallback to stored current or first
            currentSessionId = parsed.lastSessionId || parsed.currentSessionId || sessions[0]?.id || ''
            if (typeof parsed.guestSolveCount === 'number') {
                set({ guestSolveCount: parsed.guestSolveCount })
            }
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
        scrambleVisualization3D: true,
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

    // Load theme
    let currentTheme = 'default'
    try {
        const storedTheme = localStorage.getItem('ao5.theme')
        if (storedTheme && themes[storedTheme]) {
            currentTheme = storedTheme
        }
    } catch {
        // Ignore storage errors
    }

    set({ sessions, currentSessionId, settings, currentTheme })
    
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
          penalty: penalty || null,
          synced: false
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
            updates.lastSolveWasPB = { types: pbTypes, id: Date.now().toString() }
        }
        set(updates)
        
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ 
              sessions: updatedSessions, 
              currentSessionId: state.currentSessionId, 
              lastSessionId: state.currentSessionId,
              guestSolveCount: state.guestSolveCount 
          }))
        } catch {
          // Ignore storage errors
        }

        // Cloud sync
        void (async () => {
          try {
            const { data } = await supabase.auth.getSession()
            if (data.session?.user) {
              await syncSolveToCloud(entry)
              get().setSolveSynced(entry.id, true)
            } else {
                // Guest user logic
                const newCount = state.guestSolveCount + 1
                set({ guestSolveCount: newCount })
                // Persist count
                try {
                    localStorage.setItem(STORAGE_KEY, JSON.stringify({ sessions: updatedSessions, currentSessionId: state.currentSessionId, guestSolveCount: newCount }))
                } catch { /* ignore */ }

                if (newCount === 5) {
                    import('./authStore').then(m => m.useAuth.getState().setShowLoginPrompt(true))
                }
            }
          } catch (error) {
            console.error('[store] Failed to sync solve:', error)
          }
        })()

        get().nextScramble()
        get().timer?.reset()
      }
    })
    
    // Detect mobile/touch to increase hold time
    const isTouch = typeof window !== 'undefined' && (('ontouchstart' in window) || navigator.maxTouchPoints > 0)
    const holdDurationMs = isTouch ? 500 : 300
    
    timer.updateSettings({ 
        inspectionDurationMs: settings.inspectionDuration,
        holdDurationMs: holdDurationMs,
        inspectionEnabled: settings.inspectionEnabled
    })
    set({ timer })
  },

  initPresence: () => {
      // Realtime concurrent users
      const channel = supabase.channel('online-users', {
          config: {
              presence: {
                  key: crypto.randomUUID(),
              },
          },
      })

      channel.on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState()
          const count = Object.keys(state).length
          set({ concurrentUsers: count })
      }).subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
              await channel.track({ online_at: new Date().toISOString() })
          }
      })
  },

  startListening: () => {
    if (get().listening) return
    const timer = get().timer
    if (!timer) return
    
    const activeKeys = new Set<string>()
    
    const shouldIgnore = (e: KeyboardEvent) => {
        const target = e.target as HTMLElement
        // If target is body, we're definitely not in an input
        if (target === document.body) return false
        
        return target.tagName === 'INPUT' || 
               target.tagName === 'TEXTAREA' || 
               target.tagName === 'SELECT' || 
               target.tagName === 'BUTTON' ||
               target.isContentEditable ||
               target.closest('[role="dialog"]') !== null // Also ignore if inside a modal? Maybe too aggressive if we want to allow timer in some modals? 
               // Actually, if we are in a modal, we probably DON'T want to start the timer.
               // But let's stick to interactive elements first.
               // If a user is in a modal, they might press Space to close it (if focused on close button) or toggle something.
               // We should definitely ignore inputs/buttons.
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (shouldIgnore(e)) return

      if (e.code === 'Space') {
          // Prevent scrolling
          e.preventDefault()
      }
      
      // Ignore Tab and Enter for global "key held" state (which hides UI)
      if (e.code === 'Tab' || e.code === 'Enter') return

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
              // Always go to ready (timer handles inspection logic)
              timer.handleKeyDown(e.code, { repeat: e.repeat })
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
          }
      }
    }
    
    const onKeyUp = (e: KeyboardEvent) => {
      if (shouldIgnore(e)) return

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
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ 
            sessions, 
            currentSessionId: newSession.id,
            lastSessionId: newSession.id 
        }))
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
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ 
            sessions: state.sessions, 
            currentSessionId: id,
            lastSessionId: id // Persist last used session
        }))
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

  mergeSessionId: (oldId: string, newId: string) => {
      const state = get()
      const sessions = state.sessions.map(s => {
          if (s.id === oldId) {
              return {
                  ...s,
                  id: newId,
                  solves: s.solves.map(solve => ({ ...solve, sessionId: newId }))
              }
          }
          return s
      })
      
      let currentSessionId = state.currentSessionId
      if (currentSessionId === oldId) {
          currentSessionId = newId
      }

      set({ sessions, currentSessionId })
      try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ sessions, currentSessionId }))
      } catch {
          // Ignore
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
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ 
            sessions, 
            currentSessionId: state.currentSessionId,
            lastSessionId: state.currentSessionId,
            guestSolveCount: state.guestSolveCount 
        }))
    } catch {}

    // Cloud sync
    void (async () => {
        try {
            const { data } = await supabase.auth.getSession()
            if (data.session?.user) {
                await deleteSolveFromCloud(id)
            }
        } catch (e) { console.error(e) }
    })()
  },
  
  updateSolvePenalty: (id: string, penalty: "plus2" | "DNF" | null) => {
      const state = get()
      const session = state.sessions.find(s => s.id === state.currentSessionId)
      if (!session) return

      const solves = session.solves.map(s => 
          s.id === id ? { ...s, penalty } : s
      )
      
      const sessions = state.sessions.map(s => 
          s.id === state.currentSessionId ? { ...s, solves } : s
      )
      const stats = calculateAverages(solves)
      set({ sessions, ...stats })
      
      try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ 
              sessions, 
              currentSessionId: state.currentSessionId,
              lastSessionId: state.currentSessionId,
              guestSolveCount: state.guestSolveCount 
          }))
      } catch {}

      // Cloud sync
      void (async () => {
          try {
              const { data } = await supabase.auth.getSession()
              if (data.session?.user) {
                  console.log('[store] Calling updateSolvePenaltyInCloud for:', id, penalty)
                  await import('./cloudSync').then(m => m.updateSolvePenaltyInCloud(id, penalty))
              }
          } catch (e) { console.error(e) }
      })()
  },

  setSolveSynced: (id: string, synced: boolean) => {
      const state = get()
      // Find session containing the solve
      const session = state.sessions.find(s => s.solves.some(solve => solve.id === id))
      if (!session) return

      const solves = session.solves.map(s => s.id === id ? { ...s, synced } : s)
      const sessions = state.sessions.map(s => 
          s.id === session.id ? { ...s, solves } : s
      )
      
      set({ sessions })
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ sessions, currentSessionId: state.currentSessionId }))
      } catch {
        // Ignore
      }
  },

  getAllSolves: () => {
      return get().sessions.flatMap(s => s.solves)
  },

  hydrateSolves: (entries: SolveEntry[], cloudSessions?: { id: string, name: string, puzzleType: string }[]) => {
    console.log('[store] Hydrating solves:', entries.length)
    const state = get()
    
    let newSessions = [...state.sessions]

    if (cloudSessions) {
        // 1. Remove empty local-only sessions (cleanup guest sessions)
        newSessions = newSessions.filter(s => {
            const isCloud = cloudSessions.some(cs => cs.id === s.id)
            const isEmpty = s.solves.length === 0
            // Keep if it's a cloud session OR if it has local solves
            return isCloud || !isEmpty
        })

        // 2. Ensure all cloud sessions exist locally
        cloudSessions.forEach(cs => {
            const existingIndex = newSessions.findIndex(s => s.id === cs.id)
            if (existingIndex === -1) {
                newSessions.push({
                    id: cs.id,
                    name: cs.name,
                    puzzleType: cs.puzzleType as PuzzleType,
                    solves: []
                })
            } else {
                // Update metadata
                newSessions[existingIndex] = {
                    ...newSessions[existingIndex],
                    name: cs.name,
                    puzzleType: cs.puzzleType as PuzzleType
                }
            }
        })
    }

    // 3. Distribute solves
    // Group entries by sessionId
    const bySession: Record<string, SolveEntry[]> = {}
    const legacyByType: Record<string, SolveEntry[]> = {}
    
    entries.forEach(e => {
        if (e.sessionId) {
            if (!bySession[e.sessionId]) bySession[e.sessionId] = []
            bySession[e.sessionId].push(e)
        } else {
            const type = e.puzzleType || '333'
            if (!legacyByType[type]) legacyByType[type] = []
            legacyByType[type].push(e)
        }
    })

    // Assign solves to sessions
    newSessions = newSessions.map(s => {
        const sessionSolves = bySession[s.id] || []
        
        // If this session matches a legacy type and we have legacy solves, maybe we should include them?
        // But usually legacy solves are put into a new "Cloud" session.
        // Let's stick to explicit assignment first.
        
        return {
            ...s,
            solves: sessionSolves.sort((a, b) => a.timestamp - b.timestamp)
        }
    })

    // 4. Handle legacy/unlinked solves
    Object.entries(legacyByType).forEach(([type, solves]) => {
        // Find a session to dump them in? Or create new?
        // Existing logic created new "Cloud" sessions.
        // Let's try to find an existing session of this type first?
        // No, that might mix data. Safer to create separate if they lack ID.
        
        // Check if we already have a "Cloud" session for this type
        const existingIndex = newSessions.findIndex(s => s.puzzleType === type && s.name.includes('Cloud'))
        
        if (existingIndex >= 0) {
             const current = newSessions[existingIndex].solves
             const merged = [...current, ...solves].sort((a, b) => a.timestamp - b.timestamp)
             // Dedup
             const unique = Array.from(new Map(merged.map(s => [s.id, s])).values())
             newSessions[existingIndex] = { ...newSessions[existingIndex], solves: unique }
        } else {
            newSessions.push({
                id: crypto.randomUUID(),
                name: `${SUPPORTED_EVENTS.find(e => e.id === type)?.name || type} Cloud`,
                puzzleType: type as PuzzleType,
                solves: solves.sort((a, b) => a.timestamp - b.timestamp)
            })
        }
    })
    
    // Ensure at least one session
    if (newSessions.length === 0) {
        const defaultSession: Session = {
            id: crypto.randomUUID(),
            name: '3x3 Session',
            puzzleType: '3x3',
            solves: []
        }
        newSessions = [defaultSession]
    }

    // Update stats if current session was affected
    let currentSessionId = state.currentSessionId
    
    // Determine the session with the latest activity (solve)
    let latestSessionId = newSessions[0]?.id
    let latestTimestamp = -1
    
    newSessions.forEach(s => {
        if (s.solves.length > 0) {
            const lastSolve = s.solves[s.solves.length - 1]
            if (lastSolve.timestamp > latestTimestamp) {
                latestTimestamp = lastSolve.timestamp
                latestSessionId = s.id
            }
        }
    })

    // If current session was removed OR if we want to default to latest (e.g. on fresh login/hydration)
    // We should probably switch to latest if the current session is empty/default AND we have a better one?
    // Or simply: if the current session ID is NOT in the new list, switch to latest.
    // AND: if the current session is "empty" but we have other sessions with data, maybe switch?
    // Let's stick to: if current is removed, switch to latest.
    
    const currentExists = newSessions.find(s => s.id === currentSessionId)
    
    if (!currentExists) {
        currentSessionId = latestSessionId
    } else {
        // If current exists but is empty, and we have a session with data, switch to it?
        // Only if we are hydrating from cloud (which implies a sync/login event usually)
        if (cloudSessions && currentExists.solves.length === 0 && latestTimestamp > 0) {
             currentSessionId = latestSessionId
        }
    }
    
    const currentSession = newSessions.find(s => s.id === currentSessionId)
    if (currentSession) {
        const stats = calculateAverages(currentSession.solves)
        set({ sessions: newSessions, currentSessionId, ...stats })
    } else {
        set({ sessions: newSessions, currentSessionId })
    }
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ sessions: newSessions, currentSessionId }))
    } catch {
      // Ignore storage errors
    }
  },

  clearSolves: () => {
      console.log('[store] Clearing solves and resetting sessions')
      const defaultSession: Session = {
          id: crypto.randomUUID(),
          name: '3x3 Session',
          puzzleType: '3x3',
          solves: []
      }
      set({ sessions: [defaultSession], currentSessionId: defaultSession.id, guestSolveCount: 0 })
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ sessions: [defaultSession], currentSessionId: defaultSession.id, guestSolveCount: 0 }))
      } catch { /* ignore */ }
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
      scrambleVisualization3D: false,
      pbEffectsEnabled: true
  },
  
  updateSettings: (newSettings: Partial<Settings>) => {
      const state = get()
      const updated = { ...state.settings, ...newSettings }
      
      // Update timer if needed
      if (newSettings.inspectionDuration || newSettings.inspectionEnabled !== undefined) {
          state.timer?.updateSettings({ 
              inspectionDurationMs: updated.inspectionDuration,
              inspectionEnabled: updated.inspectionEnabled
          })
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
  },


}))
