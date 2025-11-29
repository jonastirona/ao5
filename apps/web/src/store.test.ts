import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useStore } from './store'
import { act } from 'react'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString()
    },
    clear: () => {
      store = {}
    },
    removeItem: (key: string) => {
      delete store[key]
    }
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

// Mock Supabase
vi.mock('./lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null })
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      upsert: vi.fn().mockResolvedValue({ error: null })
    })
  }
}))

// Mock cloudSync
vi.mock('./cloudSync', () => ({
  syncSolveToCloud: vi.fn(),
  deleteSolveFromCloud: vi.fn().mockResolvedValue(true),
  updateCloudSession: vi.fn(),
  deleteCloudSession: vi.fn()
}))

// Mock core
vi.mock('core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('core')>()
  return {
    ...actual,
    generateScramble: vi.fn().mockResolvedValue('R U R\' U\''),
    calculateAverages: actual.calculateAverages,
    TimerStateMachine: actual.TimerStateMachine
  }
})

describe('Store', () => {
  beforeEach(() => {
    localStorage.clear()
    useStore.setState({
      sessions: [],
      currentSessionId: '',
      scramble: '',
      scrambleHistory: [],
      currentScrambleIndex: 0,
      initialized: false,
      ao5: null,
      ao12: null,
      ao100: null,
      best: null,
      worst: null
    })
  })

  it('should initialize with a default session', async () => {
    await act(async () => {
      await useStore.getState().init()
    })
    
    const state = useStore.getState()
    expect(state.sessions.length).toBe(1)
    expect(state.sessions[0].name).toBe('3x3 Session')
    expect(state.currentSessionId).toBe(state.sessions[0].id)
  })

  it('should create a new session', () => {
    useStore.setState({
        sessions: [{ id: '1', name: 'Default', puzzleType: '3x3', solves: [] }],
        currentSessionId: '1'
    })

    act(() => {
      useStore.getState().createSession('New Session', '2x2')
    })

    const state = useStore.getState()
    expect(state.sessions.length).toBe(2)
    expect(state.sessions[1].name).toBe('New Session')
    expect(state.sessions[1].puzzleType).toBe('2x2')
    expect(state.currentSessionId).toBe(state.sessions[1].id)
  })

  it('should switch sessions', () => {
    const s1 = { id: '1', name: 'S1', puzzleType: '3x3' as const, solves: [] }
    const s2 = { id: '2', name: 'S2', puzzleType: '2x2' as const, solves: [] }
    
    useStore.setState({
        sessions: [s1, s2],
        currentSessionId: '1'
    })

    act(() => {
      useStore.getState().switchSession('2')
    })

    expect(useStore.getState().currentSessionId).toBe('2')
  })

  it('should delete a session', () => {
    const s1 = { id: '1', name: 'S1', puzzleType: '3x3' as const, solves: [] }
    const s2 = { id: '2', name: 'S2', puzzleType: '2x2' as const, solves: [] }
    
    useStore.setState({
        sessions: [s1, s2],
        currentSessionId: '2'
    })

    act(() => {
      useStore.getState().deleteSession('2')
    })

    const state = useStore.getState()
    expect(state.sessions.length).toBe(1)
    expect(state.sessions[0].id).toBe('1')
    expect(state.currentSessionId).toBe('1')
  })

  it('should update stats when adding a solve (simulated via hydration/update)', () => {
    // We can't easily simulate the timer stopping without mocking the TimerStateMachine extensively.
    // Instead, let's test the stats calculation via hydration or manual state manipulation which uses the same logic.
    // Actually, let's use `updateSolvePenalty` to trigger a recalc, or `deleteSolve`.
    
    const solve1 = { id: 's1', timeMs: 10000, scramble: 'A', timestamp: 100, puzzleType: '3x3' as const, penalty: null }
    const solve2 = { id: 's2', timeMs: 12000, scramble: 'B', timestamp: 200, puzzleType: '3x3' as const, penalty: null }
    const solve3 = { id: 's3', timeMs: 11000, scramble: 'C', timestamp: 300, puzzleType: '3x3' as const, penalty: null }
    const solve4 = { id: 's4', timeMs: 13000, scramble: 'D', timestamp: 400, puzzleType: '3x3' as const, penalty: null }
    const solve5 = { id: 's5', timeMs: 10500, scramble: 'E', timestamp: 500, puzzleType: '3x3' as const, penalty: null }
    
    const session = { id: '1', name: 'S1', puzzleType: '3x3' as const, solves: [solve1, solve2, solve3, solve4, solve5] }
    
    useStore.setState({
        sessions: [session],
        currentSessionId: '1'
    })
    
    // Trigger a recalc by switching session (which calls calculateAverages)
    act(() => {
        useStore.getState().switchSession('1')
    })

    const state = useStore.getState()
    // 10, 12, 11, 13, 10.5
    // Sorted: 10, 10.5, 11, 12, 13
    // Trim 10 and 13. Avg of 10.5, 11, 12 = 33.5 / 3 = 11.166...
    expect(state.ao5).toBeCloseTo(11167, -1) // ~11166.66 ms
    expect(state.best).toBe(10000)
    expect(state.worst).toBe(13000)
  })

  it('should handle +2 penalty correctly', () => {
    const solve = { id: 's1', timeMs: 10000, scramble: 'A', timestamp: 100, puzzleType: '3x3' as const, penalty: null }
    const session = { id: '1', name: 'S1', puzzleType: '3x3' as const, solves: [solve] }
    
    useStore.setState({
        sessions: [session],
        currentSessionId: '1'
    })

    act(() => {
        useStore.getState().updateSolvePenalty('s1', 'plus2')
    })

    const state = useStore.getState()
    const updatedSolve = state.sessions[0].solves[0]
    expect(updatedSolve.penalty).toBe('plus2')
    
    // Best should now be 12000
    expect(state.best).toBe(12000)
  })

  it('should handle DNF penalty correctly', () => {
    const solve = { id: 's1', timeMs: 10000, scramble: 'A', timestamp: 100, puzzleType: '3x3' as const, penalty: null }
    const session = { id: '1', name: 'S1', puzzleType: '3x3' as const, solves: [solve] }
    
    useStore.setState({
        sessions: [session],
        currentSessionId: '1'
    })

    act(() => {
        useStore.getState().updateSolvePenalty('s1', 'DNF')
    })

    const state = useStore.getState()
    const updatedSolve = state.sessions[0].solves[0]
    expect(updatedSolve.penalty).toBe('DNF')
    
    // Best should be null or Infinity? Store logic sets best to null if no valid solves?
    // calculateAverages returns null for best if no valid solves.
    expect(state.best).toBeNull()
  })
})
