import { useStore } from '../store'
import { useEffect, useRef } from 'react'
import { TwistyPlayer } from 'cubing/twisty'

const PUZZLE_MAPPING: Record<string, string> = {
  '3x3': '3x3x3',
  '2x2': '2x2x2',
  '4x4': '4x4x4',
  '5x5': '5x5x5',
  '6x6': '6x6x6',
  '7x7': '7x7x7',
  'megaminx': 'megaminx',
  'pyraminx': 'pyraminx',
  'skewb': 'skewb',
  'sq1': 'square1',
  '333mbf': '3x3x3'
}

export default function ScrambleDisplay() {
  const scramble = useStore(s => s.scramble)
  const nextScramble = useStore(s => s.nextScramble)
  const previousScramble = useStore(s => s.previousScramble)
  const settings = useStore(s => s.settings)

  const sessions = useStore(s => s.sessions)
  const currentSessionId = useStore(s => s.currentSessionId)
  const currentSession = sessions.find(s => s.id === currentSessionId)
  const puzzleType = currentSession?.puzzleType || '333'

  const containerRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<TwistyPlayer | null>(null)

  useEffect(() => {
    if (!settings.showScrambleImage || !containerRef.current) {
      if (playerRef.current) {
        playerRef.current.remove()
        playerRef.current = null
      }
      return
    }

    if (!playerRef.current) {
      playerRef.current = new TwistyPlayer({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        puzzle: (PUZZLE_MAPPING[puzzleType] || '3x3x3') as any,
        visualization: settings.scrambleVisualization3D ? '3D' : '2D',
        alg: scramble,
        background: 'none',
        controlPanel: 'none',
        hintFacelets: 'none',
        experimentalSetupAnchor: 'start'
      })
      // Custom styling for the player
      playerRef.current.style.width = '100%'
      playerRef.current.style.height = '100%'
      containerRef.current.appendChild(playerRef.current)
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      playerRef.current.puzzle = (PUZZLE_MAPPING[puzzleType] || '3x3x3') as any
      playerRef.current.alg = scramble
      playerRef.current.visualization = settings.scrambleVisualization3D ? '3D' : '2D'
    }
  }, [scramble, puzzleType, settings.showScrambleImage, settings.scrambleVisualization3D])

  return (
    <div className="scramble-wrapper" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
      <div className="scramble-container">
        <button
          className="scramble-nav-btn"
          onClick={previousScramble}
          aria-label="previous scramble"
        >
          ←
        </button>
        <div className="scramble-text" style={{ maxWidth: '800px', textAlign: 'center', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{scramble}</div>
        <button
          className="scramble-nav-btn"
          onClick={nextScramble}
          aria-label="next scramble"
        >
          →
        </button>
      </div>

      <div
        ref={containerRef}
        className="scramble-visualization"
        style={{
          opacity: settings.showScrambleImage ? 0.8 : 0,
          transition: 'opacity 0.2s, transform 0.2s',
          visibility: settings.showScrambleImage ? 'visible' : 'hidden',
          transform: `scale(${settings.scrambleImageScale || 1})`,
          transformOrigin: 'top center'
        }}
      />
    </div>
  )
}


