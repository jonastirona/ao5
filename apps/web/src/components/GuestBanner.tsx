import { useState, useEffect } from 'react'
import { useAuth } from '../authStore'
import { useStore } from '../store'

export default function GuestBanner() {
    const user = useAuth(s => s.user)
    const guestSolveCount = useStore(s => s.guestSolveCount)
    const [dismissed, setDismissed] = useState(false)

    useEffect(() => {
        if (localStorage.getItem('ao5.guestBannerDismissed')) {
            setDismissed(true)
        }
    }, [])

    const handleDismiss = () => {
        setDismissed(true)
        localStorage.setItem('ao5.guestBannerDismissed', 'true')
    }

    if (user || guestSolveCount < 5 || dismissed) return null

    return (
        <div className="guest-banner">
            <span>
                log in / sign up to save your solves and view stats across devices.
            </span>
            <button onClick={() => window.dispatchEvent(new CustomEvent('open-auth-modal'))}>log in / sign up</button>
            <button
                onClick={handleDismiss}
                className="close-btn"
                aria-label="Dismiss"
            >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                </svg>
            </button>
            <style>{`
                .guest-banner {
                    background: var(--bg);
                    border-bottom: 1px solid var(--border);
                    padding: 0.75rem 2rem;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    gap: 1rem;
                    font-size: 0.875rem;
                    color: var(--text-secondary);
                    position: sticky;
                    top: 0;
                    z-index: 100;
                }
                .guest-banner button:not(.close-btn) {
                    background: var(--accent);
                    color: white;
                    border: none;
                    padding: 0.25rem 0.75rem;
                    border-radius: 4px;
                    font-family: inherit;
                    font-size: 0.75rem;
                    font-weight: 600;
                    cursor: pointer;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }
                .guest-banner button:not(.close-btn):hover {
                    opacity: 0.9;
                }
                .guest-banner .close-btn {
                    background: transparent;
                    border: none;
                    color: var(--text-secondary);
                    cursor: pointer;
                    padding: 4px;
                    display: flex;
                    align-items: center;
                    opacity: 0.6;
                }
                .guest-banner .close-btn:hover {
                    opacity: 1;
                }
            `}</style>
        </div>
    )
}
