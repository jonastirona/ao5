import { useEffect, useRef } from 'react'

interface Props {
    onClose: () => void
}

/**
 * Tooltip component shown to new users to guide them to the onboarding tour.
 */
export default function HelpTooltip({ onClose }: Props) {
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                onClose()
            }
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose()
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        document.addEventListener('keydown', handleKeyDown)

        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
            document.removeEventListener('keydown', handleKeyDown)
        }
    }, [onClose])

    return (
        <div className="help-tooltip" ref={ref}>
            <div className="help-tooltip-content">
                <span>need help? click here for a tour</span>
                <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="help-tooltip-close">×</button>
            </div>
            <div className="help-tooltip-arrow"></div>
        </div>
    )
}
