import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useStore } from '../store'

interface ShareModalProps {
    isOpen: boolean
    onClose: () => void
    solveId?: string
    title?: string
    value?: string
}

import { useFocusTrap } from '../hooks/useFocusTrap'

export default function ShareModal({ isOpen, onClose, solveId, title, value }: ShareModalProps) {
    const [isCopied, setIsCopied] = useState(false)
    const modalRef = useFocusTrap(isOpen, onClose)

    // Find the solve to share
    const solve = useStore(s => {
        if (solveId) {
            const session = s.sessions.find(sess => sess.id === s.currentSessionId)
            return session?.solves.find(solve => solve.id === solveId)
        }
        // Default to latest solve if no ID provided AND no title/value provided
        if (!title && !value) {
            const session = s.sessions.find(sess => sess.id === s.currentSessionId)
            return session?.solves[0]
        }
        return undefined
    })

    useEffect(() => {
        if (isOpen) {
            setIsCopied(false)
        }
    }, [isOpen])

    if (!isOpen) return null

    let shareText = ''
    let displayValue = ''
    let displaySubtext = ''

    if (title && value) {
        displayValue = value
        displaySubtext = title
        shareText = `My ${title} on ao5 is ${value}! 🧩\n\nTry it out at https://ao5.app`
    } else if (solve) {
        const time = solve.penalty === 'DNF'
            ? 'DNF'
            : (solve.timeMs + (solve.penalty === 'plus2' ? 2000 : 0)) / 1000

        displayValue = `${typeof time === 'number' ? time.toFixed(2) : time}s`
        displaySubtext = solve.scramble
        shareText = `I just got a ${displayValue} solve on ao5! 🧩\n\nScramble: ${solve.scramble}\n\nTry it out at https://ao5.app`
    } else {
        return null
    }

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(shareText)
            setIsCopied(true)
            setTimeout(() => setIsCopied(false), 2000)
        } catch (err) {
            console.error('Failed to copy:', err)
        }
    }

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'My ao5 Solve',
                    text: shareText,
                    url: 'https://ao5.app'
                })
            } catch (err) {
                console.log('Error sharing:', err)
            }
        } else {
            handleCopy()
        }
    }

    const handleTwitter = () => {
        const text = encodeURIComponent(shareText)
        window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank')
    }

    return createPortal(
        <div className="modal-overlay" onClick={onClose}>
            <div ref={modalRef} className="modal-content share-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>share result</h2>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>

                <div className="share-preview">
                    <div className="share-card">
                        <div className="share-time">{displayValue}</div>
                        <div className="share-scramble">{displaySubtext}</div>
                        <div className="share-footer">ao5.app</div>
                    </div>
                </div>

                <div className="share-actions">
                    <button className="btn primary" onClick={handleShare}>
                        {'share' in navigator ? 'share' : 'copy to clipboard'}
                        {isCopied && <span className="copied-badge">copied!</span>}
                    </button>
                    <button className="btn secondary" onClick={handleTwitter}>
                        share on x
                    </button>
                </div>
            </div>
        </div>,
        document.body
    )
}
