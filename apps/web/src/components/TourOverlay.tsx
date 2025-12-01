import { useFocusTrap } from '../hooks/useFocusTrap'
import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'

interface TourStep {
    target: string // data-tour attribute value
    title: string
    content: React.ReactNode
    position?: 'top' | 'bottom' | 'left' | 'right' | 'center'
}

interface TourOverlayProps {
    isOpen: boolean
    onClose: () => void
}

const TOUR_STEPS: TourStep[] = [
    {
        target: 'welcome',
        title: 'welcome to ao5',
        content: 'let\'s take a quick tour of the features!',
        position: 'center'
    },
    {
        target: 'timer',
        title: 'the timer',
        content: 'this is the main event. hold space to start inspection, release to solve. your time will be saved automatically.',
        position: 'bottom'
    },
    {
        target: 'scramble',
        title: 'scramble',
        content: 'here is your current scramble. it updates automatically after each solve.',
        position: 'bottom'
    },
    {
        target: 'session-selector',
        title: 'sessions',
        content: 'manage your sessions here. create new ones for different puzzles or organize your solves.',
        position: 'bottom'
    },
    {
        target: 'solve-list',
        title: 'session list',
        content: 'view your recent solves here. you can delete solves or change penalties if needed.',
        position: 'top'
    },
    {
        target: 'shortcuts-info',
        title: 'keyboard shortcuts',
        content: (
            <div className="tour-shortcuts">
                <p style={{ marginBottom: '1rem' }}>master the app with these shortcuts:</p>
                <ul className="keybindings-list" style={{ padding: 0, margin: 0 }}>
                    <li>
                        <kbd>space</kbd>
                        <span>start/stop timer</span>
                    </li>
                    <li>
                        <kbd>esc</kbd>
                        <span>reset / cancel inspection</span>
                    </li>
                    <li>
                        <div className="key-combo">
                            <kbd>alt / opt</kbd> + <kbd>2</kbd>
                        </div>
                        <span>+2 penalty</span>
                    </li>
                    <li>
                        <div className="key-combo">
                            <kbd>alt / opt</kbd> + <kbd>d</kbd>
                        </div>
                        <span>dnf solve</span>
                    </li>

                </ul>
            </div>
        ),
        position: 'center'
    },
    {
        target: 'help-button',
        title: 'help',
        content: 'click this anytime to replay this tour.',
        position: 'bottom'
    },
    {
        target: 'stats-link',
        title: 'analytics',
        content: 'click here to view detailed statistics, progression charts, and heatmaps of your activity.',
        position: 'bottom'
    },
    {
        target: 'support-link',
        title: 'support',
        content: 'want to support us? found a bug? reach out here.',
        position: 'bottom'
    },
    {
        target: 'about-link',
        title: 'info',
        content: 'learn more about the app, view keyboard shortcuts, and see credits.',
        position: 'bottom'
    },
    {
        target: 'settings-link',
        title: 'settings',
        content: 'customize the app to your liking. change themes, adjust timer behavior, and manage your account.',
        position: 'bottom'
    },
    {
        target: 'account-link',
        title: 'profile',
        content: 'manage your account settings, view your profile, and sign out.',
        position: 'bottom'
    }
]

export default function TourOverlay({ isOpen, onClose }: TourOverlayProps) {
    const [currentStepIndex, setCurrentStepIndex] = useState(0)
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
    const [isTransitioning, setIsTransitioning] = useState(false)
    const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({})
    const tooltipRef = useRef<HTMLDivElement>(null)
    useFocusTrap(isOpen, onClose, tooltipRef)

    const [positionedStep, setPositionedStep] = useState(-1)

    const currentStep = TOUR_STEPS[currentStepIndex]

    const getTargetRect = useCallback((step: TourStep) => {
        if (step.target === 'welcome' || step.target === 'shortcuts-info') {
            // Virtual center target matching tooltip size exactly
            // Tooltip width is 320px + 1.5rem (24px) padding * 2 = 368px
            // But we want the spotlight to match the VISUAL card size.
            // The card is 320px wide + padding.
            // ADJUST WELCOME SPOTLIGHT WIDTH HERE
            const width = Math.min(320, window.innerWidth - 32) // Responsive width
            const height = step.target === 'shortcuts-info' ? 345 : 170 // Approximate height
            return {
                top: window.innerHeight / 2 - height / 2,
                left: window.innerWidth / 2 - width / 2,
                width,
                height,
                right: window.innerWidth / 2 + width / 2,
                bottom: window.innerHeight / 2 + height / 2,
                x: window.innerWidth / 2 - width / 2,
                y: window.innerHeight / 2 - height / 2,
                toJSON: () => { }
            }
        }

        const element = document.querySelector(`[data-tour="${step.target}"]`)
        if (element) {
            const rect = element.getBoundingClientRect()
            // Add some padding
            const padding = 10
            return {
                top: rect.top - padding,
                left: rect.left - padding,
                width: rect.width + padding * 2,
                height: rect.height + padding * 2,
                right: rect.right + padding,
                bottom: rect.bottom + padding,
                x: rect.left - padding,
                y: rect.top - padding,
                toJSON: () => { }
            }
        }
        return null
    }, [])

    const updateTargetRect = useCallback((index: number) => {
        const rect = getTargetRect(TOUR_STEPS[index])
        setTargetRect(rect)
    }, [getTargetRect])

    const handleNext = useCallback(() => {
        if (currentStepIndex < TOUR_STEPS.length - 1) {
            setIsTransitioning(true)
            // Wait for fade out
            setTimeout(() => {
                const nextIndex = currentStepIndex + 1
                const nextRect = getTargetRect(TOUR_STEPS[nextIndex])

                // Batch updates to prevent jumping
                setCurrentStepIndex(nextIndex)
                setTargetRect(nextRect)

                // Wait for rect transition to start/finish slightly before fading in
                setTimeout(() => {
                    setIsTransitioning(false)
                }, 150)
            }, 200)
        } else {
            onClose()
        }
    }, [currentStepIndex, getTargetRect, onClose])

    const handleBack = useCallback(() => {
        if (currentStepIndex > 0) {
            setIsTransitioning(true)
            setTimeout(() => {
                const prevIndex = currentStepIndex - 1
                const prevRect = getTargetRect(TOUR_STEPS[prevIndex])

                // Batch updates
                setCurrentStepIndex(prevIndex)
                setTargetRect(prevRect)

                setTimeout(() => {
                    setIsTransitioning(false)
                }, 150)
            }, 200)
        }
    }, [currentStepIndex, getTargetRect])

    useEffect(() => {
        if (isOpen) {
            setCurrentStepIndex(0)
            updateTargetRect(0)

            // Prevent scrolling
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }

        return () => {
            document.body.style.overflow = ''
        }
    }, [isOpen, updateTargetRect])

    useEffect(() => {
        let timeoutId: ReturnType<typeof setTimeout>
        const handleResize = () => {
            clearTimeout(timeoutId)
            timeoutId = setTimeout(() => updateTargetRect(currentStepIndex), 100)
        }

        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return

            if (e.key === 'Escape') {
                onClose()
            } else if (e.key === 'ArrowRight') {
                handleNext()
            } else if (e.key === 'ArrowLeft') {
                handleBack()
            }
        }

        window.addEventListener('resize', handleResize)
        window.addEventListener('keydown', handleKeyDown)

        return () => {
            window.removeEventListener('resize', handleResize)
            window.removeEventListener('keydown', handleKeyDown)
            clearTimeout(timeoutId)
        }
    }, [isOpen, currentStepIndex, updateTargetRect, handleNext, handleBack, onClose])

    useLayoutEffect(() => {
        if (!targetRect || !tooltipRef.current) return

        const tooltip = tooltipRef.current
        const { width: tooltipWidth, height: tooltipHeight } = tooltip.getBoundingClientRect()

        if (currentStep.position === 'center') {
            setTooltipStyle({
                top: window.innerHeight / 2 - tooltipHeight / 2,
                left: window.innerWidth / 2 - tooltipWidth / 2,
            })
            setPositionedStep(currentStepIndex)
            return
        }

        // Safe zone calculation
        const safeMargin = 16 // Minimum distance from screen edge
        const maxX = window.innerWidth - tooltipWidth - safeMargin
        const maxY = window.innerHeight - tooltipHeight - safeMargin

        // Horizontal positioning
        // Start centered on target
        let left = targetRect.left + (targetRect.width / 2) - (tooltipWidth / 2)
        // Clamp strictly
        left = Math.max(safeMargin, Math.min(left, maxX))

        // Vertical positioning
        let top = 0
        const preferTop = currentStep.position === 'top'

        // Check available space
        const spaceTop = targetRect.top - 10
        const spaceBottom = window.innerHeight - (targetRect.bottom + 20)

        if (preferTop) {
            if (spaceTop >= tooltipHeight + safeMargin) {
                top = targetRect.top - 10 - tooltipHeight
            } else if (spaceBottom >= tooltipHeight + safeMargin) {
                top = targetRect.bottom + 20
            } else {
                // If neither fits, pick the larger space
                top = spaceTop > spaceBottom
                    ? targetRect.top - 10 - tooltipHeight
                    : targetRect.bottom + 20
            }
        } else {
            if (spaceBottom >= tooltipHeight + safeMargin) {
                top = targetRect.bottom + 20
            } else if (spaceTop >= tooltipHeight + safeMargin) {
                top = targetRect.top - 10 - tooltipHeight
            } else {
                // If neither fits, pick the larger space
                top = spaceBottom > spaceTop
                    ? targetRect.bottom + 20
                    : targetRect.top - 10 - tooltipHeight
            }
        }

        // Final strict clamp
        top = Math.max(safeMargin, Math.min(top, maxY))

        setTooltipStyle({ top, left })
        setPositionedStep(currentStepIndex)
    }, [targetRect, currentStep.position, currentStepIndex])

    if (!isOpen || !targetRect) return null

    const isPositioned = positionedStep === currentStepIndex

    return createPortal(
        <div className="tour-overlay">
            {/* Spotlight SVG Mask */}
            <svg className="tour-mask" width="100%" height="100%">
                <defs>
                    <mask id="spotlight-mask">
                        <rect x="0" y="0" width="100%" height="100%" fill="white" />
                        <rect
                            x={targetRect.x}
                            y={targetRect.y}
                            width={targetRect.width}
                            height={targetRect.height}
                            rx="8"
                            fill="black"
                            className="spotlight-rect"
                        />
                    </mask>
                </defs>
                <rect
                    x="0"
                    y="0"
                    width="100%"
                    height="100%"
                    fill="rgba(0, 0, 0, 0.7)"
                    mask="url(#spotlight-mask)"
                />
                {/* Highlight Border */}
                <rect
                    x={targetRect.x}
                    y={targetRect.y}
                    width={targetRect.width}
                    height={targetRect.height}
                    rx="8"
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth="2"
                    className="spotlight-border"
                />
            </svg>

            {/* Tooltip */}
            <div
                ref={tooltipRef}
                className={`tour-tooltip ${isTransitioning ? 'fade-out' : 'fade-in'}`}
                style={{
                    ...tooltipStyle,
                    visibility: isPositioned ? 'visible' : 'hidden',
                    // Disable transitions on position properties to prevent jumping
                    transition: isPositioned ? 'opacity 0.2s ease' : 'none'
                }}
            >
                <div className="tour-header">
                    <h3>{currentStep.title}</h3>
                    <button className="close-btn-small" onClick={onClose}>×</button>
                </div>
                <p>{currentStep.content}</p>
                <div className="tour-footer">
                    <div className="tour-progress">
                        {currentStepIndex + 1} / {TOUR_STEPS.length}
                    </div>
                    <div className="tour-actions">
                        {currentStepIndex > 0 && (
                            <button className="btn ghost small" onClick={handleBack}>back</button>
                        )}
                        <button className="btn primary small" onClick={handleNext}>
                            {currentStepIndex === TOUR_STEPS.length - 1 ? 'finish' : 'next'}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    )
}
