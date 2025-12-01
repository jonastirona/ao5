import { useEffect, useState, useRef } from 'react'
import { useStore } from '../store'

/**
 * Displays an animation when a new Personal Best (PB) is achieved.
 * Supports different visual styles for major (single/ao5) vs minor PBs.
 */
export default function PBAnimation() {
    const lastSolveWasPB = useStore(s => s.lastSolveWasPB)
    const clearPBStatus = useStore(s => s.clearPBStatus)
    const [visible, setVisible] = useState(false)
    const canDismissRef = useRef(false)

    useEffect(() => {
        if (lastSolveWasPB) {
            setVisible(true)
            canDismissRef.current = false

            // Grace period before allowing dismissal
            const graceTimer = setTimeout(() => {
                canDismissRef.current = true
            }, 500)

            const duration = (lastSolveWasPB.types.includes('single') || lastSolveWasPB.types.includes('ao5')) ? 2500 : 2000
            const timer = setTimeout(() => {
                setVisible(false)
                setTimeout(clearPBStatus, 500) // Wait for fade out
            }, duration)

            const handleKeyDown = () => {
                if (!canDismissRef.current) return
                setVisible(false)
                setTimeout(clearPBStatus, 500)
            }
            window.addEventListener('keydown', handleKeyDown)

            return () => {
                clearTimeout(timer)
                clearTimeout(graceTimer)
                window.removeEventListener('keydown', handleKeyDown)
            }
        }
    }, [lastSolveWasPB, clearPBStatus])

    if (!lastSolveWasPB || !visible) return null

    const isMajor = lastSolveWasPB.types.includes('single') || lastSolveWasPB.types.includes('ao5')
    const pbText = lastSolveWasPB.types.join(' + ')

    return (
        <div
            className={`pb-container ${visible ? 'visible' : ''} ${isMajor ? 'major' : 'minor'}`}
            onClick={() => {
                if (!canDismissRef.current) return
                setVisible(false)
                setTimeout(clearPBStatus, 500)
            }}
        >
            {isMajor ? (
                <div className="pb-content">
                    <div className="pb-text">new pb!</div>
                    <div className="pb-subtext">{pbText}</div>
                    <div className="confetti-container">
                        {[...Array(30)].map((_, i) => (
                            <div key={i} className="confetti" style={{ '--i': i } as React.CSSProperties} />
                        ))}
                    </div>
                </div>
            ) : (
                <div className="pb-toast">
                    <span className="pb-icon">★</span>
                    <span>new {pbText} pb!</span>
                </div>
            )}
        </div>
    )
}
