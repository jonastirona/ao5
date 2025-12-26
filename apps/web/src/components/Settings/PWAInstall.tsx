import { useEffect, useState } from 'react'
import { useStore } from '../../store'
import '../../App.css' // Ensure we have access to variables if needed, though usually inherited



export default function PWAInstall() {
    const deferredPrompt = useStore(s => s.installPrompt)
    const setDeferredPrompt = useStore(s => s.setInstallPrompt)
    const [isInstalled, setIsInstalled] = useState(false)
    const [isIOS, setIsIOS] = useState(false)

    useEffect(() => {
        // Check if already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsInstalled(true)
        }

        // Check for iOS
        const userAgent = window.navigator.userAgent.toLowerCase()
        const ios = /iphone|ipad|ipod/.test(userAgent)
        setIsIOS(ios)
    }, [])

    const handleInstallClick = async () => {
        if (!deferredPrompt) return

        deferredPrompt.prompt()

        const { outcome } = await deferredPrompt.userChoice

        if (outcome === 'accepted') {
            setDeferredPrompt(null)
        }
    }

    // Removed early return to show info even if installed
    // if (isInstalled) return null

    return (
        <div className="pwa-install-container" style={{
            marginTop: '2rem',
            padding: '1.5rem',
            background: 'var(--bg-secondary)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border)'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                    {isInstalled ? 'app installed' : 'install app'}
                </h3>
                {isInstalled && <span style={{ color: 'var(--primary)', fontSize: '0.9rem' }}>● active</span>}
            </div>

            {!isInstalled && (
                <p style={{ margin: '0 0 1.5rem 0', color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.5' }}>
                    get the best experience with offline support and fullscreen focus.
                </p>
            )}

            {isInstalled ? (
                null
            ) : deferredPrompt ? (
                <button
                    className="btn primary full-width"
                    onClick={handleInstallClick}
                    style={{ justifyContent: 'center' }}
                >
                    install ao5
                </button>
            ) : (
                <div className="pwa-instructions" style={{
                    fontSize: '0.85rem',
                    color: 'var(--text-secondary)',
                    lineHeight: '1.4',
                    background: 'rgba(0,0,0,0.1)',
                    padding: '0.8rem',
                    borderRadius: 'var(--radius-md)'
                }}>
                    {isIOS ? (
                        <>
                            tap <strong>share</strong> → <strong>add to home screen</strong>
                        </>
                    ) : (
                        <>
                            tap browser menu (⋮) → <strong>install app</strong>
                        </>
                    )}
                </div>
            )}
        </div>
    )
}
