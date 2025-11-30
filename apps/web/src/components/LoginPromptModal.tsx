import { useAuth } from '../authStore'

export default function LoginPromptModal() {
    const showLoginPrompt = useAuth(s => s.showLoginPrompt)
    const setShowLoginPrompt = useAuth(s => s.setShowLoginPrompt)

    if (!showLoginPrompt) return null

    return (
        <div className="modal-overlay" onClick={() => setShowLoginPrompt(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <h2>save your progress</h2>
                <p>
                    you've done 5 solves! log in / sign up to save your progress and access your stats from any device. it's free.
                </p>
                <div className="modal-actions">
                    <button
                        className="primary-btn"
                        onClick={() => {
                            // Trigger the main auth modal (assuming App.tsx handles this via a separate state or we reuse this modal as entry)
                            // Actually, let's just close this and open the main auth modal if possible, 
                            // OR we can just render the Auth form here.
                            // For now, let's assume clicking this opens the main AuthModal.
                            // But wait, we don't have a global "openAuthModal" action exposed easily unless we use the one in App.tsx.
                            // Let's dispatch a custom event or use a store action if available.
                            // Since we don't have a global "openAuthModal", let's just use the `setShowLoginPrompt` to close this 
                            // and maybe we need a way to open the real AuthModal.
                            // Let's assume the user can click the "Account" button in the header.
                            // BETTER: Let's make this modal HAVE the login/signup buttons directly or redirect to it.
                            // Simplest: Just tell them to click the account button or provide a button that triggers the same state as the account button.
                            // Let's dispatch a custom event 'open-auth-modal' that App.tsx listens to.
                            window.dispatchEvent(new CustomEvent('open-auth-modal'))
                            setShowLoginPrompt(false)
                        }}
                    >
                        log in / sign up
                    </button>
                    <button
                        className="secondary-btn"
                        onClick={() => setShowLoginPrompt(false)}
                    >
                        maybe later
                    </button>
                </div>
            </div>
            <style>{`
                .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.5);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 2000;
                    backdrop-filter: blur(4px);
                }
                .modal-content {
                    background: var(--bg);
                    border: 1px solid var(--border);
                    padding: 2rem;
                    border-radius: 12px;
                    width: 100%;
                    max-width: 400px;
                    box-shadow: 0 20px 40px rgba(0,0,0,0.4);
                }
                h2 {
                    margin: 0 0 1rem 0;
                    font-size: 1.25rem;
                    font-weight: 600;
                    color: var(--text-primary);
                }
                p {
                    margin: 0 0 2rem 0;
                    color: var(--text-secondary);
                    line-height: 1.5;
                }
                .modal-actions {
                    display: flex;
                    gap: 1rem;
                    justify-content: flex-end;
                }
                button {
                    padding: 0.75rem 1.5rem;
                    border-radius: 8px;
                    font-family: inherit;
                    font-weight: 600;
                    cursor: pointer;
                    font-size: 0.875rem;
                    transition: all 0.2s;
                }
                .primary-btn {
                    background: var(--accent);
                    color: white;
                    border: none;
                }
                .primary-btn:hover {
                    opacity: 0.9;
                    transform: translateY(-1px);
                }
                .secondary-btn {
                    background: transparent;
                    border: 1px solid var(--border);
                    color: var(--text-secondary);
                }
                .secondary-btn:hover {
                    border-color: var(--text-primary);
                    color: var(--text-primary);
                }
            `}</style>
        </div>
    )
}
