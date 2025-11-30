import { useEffect } from 'react'

interface GlobalShortcutsProps {
    openOnboarding: () => void
}

export default function GlobalShortcuts({ openOnboarding }: GlobalShortcutsProps) {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if typing in an input
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                return
            }

            // Help shortcut (?) - Check both key and code for better layout support
            if ((e.key === '?' || (e.code === 'Slash' && e.shiftKey))) {
                openOnboarding()
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [openOnboarding])

    return null
}
