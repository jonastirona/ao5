import { useMemo, useRef, useLayoutEffect, useState, useEffect } from 'react'
import { useStore, type SolveEntry } from '../store'
import { calculateAverages } from 'core'

function formatTime(ms: number) {
  const s = (ms / 1000).toFixed(2)
  return s
}

function formatSolve(solve: SolveEntry) {
  if (solve.penalty === 'DNF') return 'DNF'
  const time = formatTime(solve.timeMs + (solve.penalty === 'plus2' ? 2000 : 0))
  return solve.penalty === 'plus2' ? `${time}+` : time
}

function formatAverage(ms: number | null) {
  if (ms === null) return '_'
  if (ms === -1) return 'DNF'
  return formatTime(ms)
}

type SolveRowProps = {
  solve: SolveEntry
  index: number
  onDelete: () => void
  onPenalty: (penalty: "plus2" | "DNF" | null) => void
  ao5: number | null
  ao12: number | null
  ao100: number | null
  isPbSingle?: boolean
  isPbAo5?: boolean
  isPbAo12?: boolean
  isPbAo100?: boolean
  isOpen: boolean
  onToggleScramble: () => void
  rowRef?: React.Ref<HTMLDivElement>
}

function SolveRow({ solve, index, onDelete, onPenalty, ao5, ao12, ao100, isPbSingle, isPbAo5, isPbAo12, isPbAo100, isOpen, onToggleScramble, rowRef }: SolveRowProps) {
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete()
  }

  const toggleScramble = (e: React.MouseEvent) => {
    e.stopPropagation()
    onToggleScramble()
  }

  const cyclePenalty = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (solve.penalty === null) onPenalty('plus2')
    else if (solve.penalty === 'plus2') onPenalty('DNF')
    else onPenalty(null)
  }

  return (
    <div className="solve-item-wrapper" ref={rowRef}>
      <div className="solve-item">
        <div className="solve-left">
          <span className="solve-index">#{index}</span>
          <div className="solve-inline">
            <span className={`solve-time ${solve.penalty === 'DNF' ? 'dnf' : ''} ${isPbSingle ? 'pb-value' : ''}`} onClick={cyclePenalty} title="Click to cycle penalty">
              {formatSolve(solve)}
            </span>
            <span className={`solve-avg ${isPbAo5 ? 'pb-value' : ''}`}>ao5: {formatAverage(ao5)}</span>
            <span className={`solve-avg ${isPbAo12 ? 'pb-value' : ''}`}>ao12: {formatAverage(ao12)}</span>
            <span className={`solve-avg ${isPbAo100 ? 'pb-value' : ''}`}>ao100: {formatAverage(ao100)}</span>
          </div>
        </div>
        <div className="solve-actions">
          <button className="solve-btn" onClick={toggleScramble} aria-label={isOpen ? 'Hide scramble' : 'Show scramble'}>
            {/* Rubik's cube icon */}
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="1" y="1" width="4" height="4" rx="1" ry="1" stroke="currentColor" />
              <rect x="6" y="1" width="4" height="4" rx="1" ry="1" stroke="currentColor" />
              <rect x="11" y="1" width="4" height="4" rx="1" ry="1" stroke="currentColor" />
              <rect x="1" y="6" width="4" height="4" rx="1" ry="1" stroke="currentColor" />
              <rect x="6" y="6" width="4" height="4" rx="1" ry="1" stroke="currentColor" />
              <rect x="11" y="6" width="4" height="4" rx="1" ry="1" stroke="currentColor" />
              <rect x="1" y="11" width="4" height="4" rx="1" ry="1" stroke="currentColor" />
              <rect x="6" y="11" width="4" height="4" rx="1" ry="1" stroke="currentColor" />
              <rect x="11" y="11" width="4" height="4" rx="1" ry="1" stroke="currentColor" />
            </svg>
          </button>
          <button className="solve-btn danger" onClick={handleDelete} aria-label="Delete solve">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M6 6L18 18" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
      {isOpen && (
        <div className="solve-scramble-full">{solve.scramble}</div>
      )}
    </div>
  )
}

const EMPTY_SOLVES: SolveEntry[] = []

export default function SessionList() {
  const [isExpanded, setIsExpanded] = useState(false)
  const [openScrambleId, setOpenScrambleId] = useState<string | null>(null)
  const solves = useStore(s => {
    const session = s.sessions.find(sess => sess.id === s.currentSessionId)
    return session ? session.solves : EMPTY_SOLVES
  })
  const deleteSolve = useStore(s => s.deleteSolve)
  const updateSolvePenalty = useStore(s => s.updateSolvePenalty)
  const isKeyHeld = useStore(s => s.isKeyHeld)
  const isTimerRunning = useStore(s => s.isTimerRunning)
  const listRef = useRef<HTMLDivElement>(null)
  const lastItemRef = useRef<HTMLDivElement>(null)

  const solvesWithAverages = useMemo(() => {
    return solves.map((solve, index) => {
      const historicalSolves = solves.slice(0, index + 1)
      const { ao5, ao12, ao100 } = calculateAverages(historicalSolves)
      return { ...solve, ao5, ao12, ao100 }
    })
  }, [solves])

  const { bestSingle, bestAo5, bestAo12, bestAo100 } = useMemo(() => {
    let bSingle: number | null = null
    let b5: number | null = null
    let b12: number | null = null
    let b100: number | null = null

    solvesWithAverages.forEach(s => {
      // Calculate effective time for single
      if (s.penalty !== 'DNF') {
        const time = s.timeMs + (s.penalty === 'plus2' ? 2000 : 0)
        if (bSingle === null || time < bSingle) bSingle = time
      }

      if (typeof s.ao5 === 'number' && s.ao5 > 0) {
        if (b5 === null || s.ao5 < b5) b5 = s.ao5
      }
      if (typeof s.ao12 === 'number' && s.ao12 > 0) {
        if (b12 === null || s.ao12 < b12) b12 = s.ao12
      }
      if (typeof s.ao100 === 'number' && s.ao100 > 0) {
        if (b100 === null || s.ao100 < b100) b100 = s.ao100
      }
    })
    return { bestSingle: bSingle, bestAo5: b5, bestAo12: b12, bestAo100: b100 }
  }, [solvesWithAverages])

  useLayoutEffect(() => {
    if (!isExpanded) return
    const listElement = listRef.current
    if (listElement) {
      listElement.scrollTop = listElement.scrollHeight
    }
  }, [solves, isExpanded])

  // Collapse when key is held or timer starts
  useLayoutEffect(() => {
    if (isKeyHeld || isTimerRunning) setIsExpanded(false)
  }, [isKeyHeld, isTimerRunning])

  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsExpanded(false)
      }
    }

    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isExpanded])

  const hasSolves = solvesWithAverages.length > 0
  const latest = hasSolves ? solvesWithAverages[solvesWithAverages.length - 1] : null

  // Helper to check if a solve is the best single
  const isBestSingle = (s: SolveEntry) => {
    if (!bestSingle || s.penalty === 'DNF') return false
    const time = s.timeMs + (s.penalty === 'plus2' ? 2000 : 0)
    return time === bestSingle
  }

  return (
    <div className="session-container" ref={containerRef}>
      <div
        className={`session-collapsed ${isExpanded ? 'hidden' : ''}`}
        onClick={() => {
          if (!hasSolves) return
          setOpenScrambleId(null)
          setIsExpanded(true)
        }}
        role={hasSolves ? 'button' : 'region'}
        tabIndex={hasSolves ? 0 : -1}
      >
        {latest ? (
          <SolveRow
            solve={latest}
            index={solvesWithAverages.length}
            onDelete={() => deleteSolve(latest.id)}
            onPenalty={(p) => updateSolvePenalty(latest.id, p)}
            ao5={latest.ao5}
            ao12={latest.ao12}
            ao100={latest.ao100}
            isPbSingle={isBestSingle(latest)}
            isPbAo5={!!bestAo5 && latest.ao5 === bestAo5}
            isPbAo12={!!bestAo12 && latest.ao12 === bestAo12}
            isPbAo100={!!bestAo100 && latest.ao100 === bestAo100}
            isOpen={openScrambleId === latest.id}
            onToggleScramble={() => setOpenScrambleId(prev => prev === latest.id ? null : latest.id)}
          />
        ) : (
          <div className="solve-placeholder">no solves yet</div>
        )}
      </div>

      <div
        ref={listRef}
        className={`solves-list-container ${isExpanded ? 'expanded' : 'is-collapsed'}`}
        onClick={() => {
          if (!isExpanded) return
          setOpenScrambleId(null)
          setIsExpanded(false)
        }}
        role={'button'}
        tabIndex={0}
      >
        {hasSolves ? (
          solvesWithAverages.map((s, idx) => (
            <SolveRow
              key={s.id}
              solve={s}
              index={idx + 1}
              onDelete={() => deleteSolve(s.id)}
              onPenalty={(p) => updateSolvePenalty(s.id, p)}
              ao5={s.ao5}
              ao12={s.ao12}
              ao100={s.ao100}
              isPbSingle={isBestSingle(s)}
              isPbAo5={!!bestAo5 && s.ao5 === bestAo5}
              isPbAo12={!!bestAo12 && s.ao12 === bestAo12}
              isPbAo100={!!bestAo100 && s.ao100 === bestAo100}
              rowRef={idx === solvesWithAverages.length - 1 ? lastItemRef : undefined}
              isOpen={openScrambleId === s.id}
              onToggleScramble={() => setOpenScrambleId(prev => prev === s.id ? null : s.id)}
            />
          ))
        ) : (
          <div className="solve-placeholder">no solves yet</div>
        )}
      </div>
    </div>
  )
}

