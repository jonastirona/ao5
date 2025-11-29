import { useEffect } from 'react'
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

  // Timer should be focused when key is held OR when timer is running OR during inspection
  const shouldFocus = isKeyHeld || isTimerRunning || timerState === 'inspection'

  let displayValue = formatMs(elapsedMs)
  let stateClass = timerState

  if (timerState === 'inspection') {
    displayValue = inspectionLeft !== null ? String(inspectionLeft) : '15'
    if (inspectionLeft !== null && inspectionLeft <= 3) {
      stateClass += ' inspection-warning'
    }
  } else if (timerState === 'ready') {
    stateClass = 'ready'
    displayValue = formatMs(0)
  } else if (timerState === 'idle') {
    displayValue = formatMs(elapsedMs)
  }

  return (
    <div className={`timer-container ${shouldFocus ? 'focused' : ''}`}>
      <div className={`timer-display ${stateClass} ${shouldFocus ? 'focused' : ''}`}>
        {displayValue}
      </div>
    </div>
  )
}


