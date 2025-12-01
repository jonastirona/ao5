import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useStore } from '../store'

function formatMs(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const centis = Math.floor((ms % 1000) / 10)

  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  const mm = m > 0 ? `${m}:` : ''
  const ss = m > 0 ? String(s).padStart(2, '0') : String(s)
  return `${mm}${ss}.${String(centis).padStart(2, '0')}`
}

export default function TimerDisplay() {
  const timerState = useStore(s => s.timerState)
  const elapsedMs = useStore(s => s.elapsedMs)
  const inspectionLeft = useStore(s => s.inspectionLeft)
  const isKeyHeld = useStore(s => s.isKeyHeld)
  const isTimerRunning = useStore(s => s.isTimerRunning)
  const init = useStore(s => s.init)
  const startListening = useStore(s => s.startListening)
  const timer = useStore(s => s.timer)
  const containerRef = useRef<HTMLDivElement>(null)
  const touchStartTimeRef = useRef<number | null>(null)
  const touchActiveRef = useRef<boolean>(false)

  useEffect(() => {
    (async () => {
      await init()
      startListening()
    })()
    return () => {
      // @ts-expect-error cleanup attached in store
      if (window.__ao5_cleanup) window.__ao5_cleanup()
    }
  }, [init, startListening])

  // Touch event handlers for mobile
  useEffect(() => {
    const container = containerRef.current
    if (!container || !timer) return

    const handleTouchStart = (e: TouchEvent) => {
      // Prevent default to avoid scrolling
      e.preventDefault()
      touchStartTimeRef.current = Date.now()
      touchActiveRef.current = true

      // Get current state
      const state = useStore.getState()

      // Set isKeyHeld state (similar to keyboard)
      useStore.setState({ isKeyHeld: true })

      // Handle timer state transitions (similar to Space key)
      if (state.timerState === 'timing') {
        timer.handleKeyDown('Space', { repeat: false })
        return
      }

      if (state.timerState === 'idle') {
        // Always go to ready (timer handles inspection logic)
        timer.handleKeyDown('Space', { repeat: false })
      } else if (state.timerState === 'inspection') {
        timer.handleKeyDown('Space', { repeat: false })
      } else {
        timer.handleKeyDown('Space', { repeat: false })
      }
    }

    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault()
      touchActiveRef.current = false

      // Only handle key up if we actually started a touch
      if (touchStartTimeRef.current !== null) {
        timer.handleKeyUp('Space')
        useStore.setState({ isKeyHeld: false })
        touchStartTimeRef.current = null
      }
    }

    const handleTouchCancel = (e: TouchEvent) => {
      e.preventDefault()
      touchActiveRef.current = false

      if (touchStartTimeRef.current !== null) {
        timer.handleKeyUp('Space')
        useStore.setState({ isKeyHeld: false })
        touchStartTimeRef.current = null
      }
    }

    // Add touch event listeners
    container.addEventListener('touchstart', handleTouchStart, { passive: false })
    container.addEventListener('touchend', handleTouchEnd, { passive: false })
    container.addEventListener('touchcancel', handleTouchCancel, { passive: false })

    return () => {
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchend', handleTouchEnd)
      container.removeEventListener('touchcancel', handleTouchCancel)
    }
  }, [timer])

  const [isReadyVisual, setIsReadyVisual] = useState(false)
  const holdTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (timerState === 'ready' && isKeyHeld) {
      const isTouch = typeof window !== 'undefined' && (('ontouchstart' in window) || navigator.maxTouchPoints > 0)
      const duration = isTouch ? 500 : 300

      holdTimeoutRef.current = setTimeout(() => {
        setIsReadyVisual(true)
      }, duration)
    } else {
      if (holdTimeoutRef.current) clearTimeout(holdTimeoutRef.current)
      setIsReadyVisual(false)
    }
    return () => {
      if (holdTimeoutRef.current) clearTimeout(holdTimeoutRef.current)
    }
  }, [timerState, isKeyHeld])

  // Timer should be focused when key is held OR when timer is running OR during inspection
  const shouldFocus = isKeyHeld || isTimerRunning || timerState === 'inspection'

  let displayValue = formatMs(elapsedMs)
  let stateClass: string = timerState

  if (timerState === 'inspection') {
    displayValue = inspectionLeft !== null ? String(inspectionLeft) : '15'
    if (inspectionLeft !== null && inspectionLeft <= 3) {
      stateClass += ' inspection-warning'
    }
  } else if (timerState === 'ready') {
    stateClass = isReadyVisual ? 'ready-green' : 'ready-red'
    displayValue = formatMs(0)
  } else if (timerState === 'idle') {
    displayValue = formatMs(elapsedMs)
  }

  return (
    <div
      ref={containerRef}
      className={`timer-container ${shouldFocus ? 'focused' : ''}`}
      style={{ touchAction: 'none', userSelect: 'none' }}
    >
      <div className={`timer-display ${stateClass} ${shouldFocus ? 'focused' : ''}`}>
        {displayValue}
      </div>

      {createPortal(
        (timerState === 'timing' || timerState === 'inspection') && (
          <button
            className="timer-abort-btn"
            onClick={(e) => {
              e.stopPropagation()
              e.preventDefault()
              timer?.reset()
              useStore.setState({ isKeyHeld: false })
            }}
            aria-label="Abort timer"
          >
            ✕
          </button>
        ),
        document.body
      )}
    </div>
  )
}
