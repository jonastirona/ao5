import { createPortal } from 'react-dom'
import { useAuth } from '../authStore'
import { useFocusTrap } from '../hooks/useFocusTrap'

export default function MergeSessionModal() {
    const mergePrompt = useAuth(s => s.mergePrompt)
    const resolveMerge = useAuth(s => s.resolveMerge)

    // We can't use hooks conditionally easily if we want to use useFocusTrap inside
    // But since this component will likely be always mounted and just return null, 
    // we need to be careful.
    // Actually, let's just render null if no prompt.

    // However, useFocusTrap expects to be called.
    // Let's wrap the content in a sub-component or just use the hook and pass isOpen.

    const isOpen = !!mergePrompt
    const modalRef = useFocusTrap(isOpen, () => {
        // Prevent closing by escape/click outside? 
        // Or maybe treat cancel as "Don't Merge" (Create New)
        // Let's treat cancel as "Create New" for now, or just block closing.
        // The user MUST choose.
    })

    if (!mergePrompt) return null

    return createPortal(
        <div className="modal-overlay" style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            backdropFilter: 'blur(4px)'
        }}>
            <div ref={modalRef} className="modal-content" style={{
                backgroundColor: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '24px',
                maxWidth: '400px',
                width: '90%',
                boxShadow: 'var(--shadow)'
            }}>
                <h3 style={{ marginTop: 0, color: 'var(--text-primary)' }}>merge session?</h3>
                <p style={{ color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                    you have unsaved solves in your guest session. would you like to merge them into an existing session?
                </p>

                <div className="session-list" style={{
                    maxHeight: '200px',
                    overflowY: 'auto',
                    margin: '16px 0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                }}>
                    {mergePrompt.cloudSessions.map(session => (
                        <button
                            key={session.id}
                            className="btn ghost"
                            style={{
                                justifyContent: 'flex-start',
                                textAlign: 'left',
                                border: '1px solid var(--border)',
                                padding: '12px'
                            }}
                            onClick={() => resolveMerge(session.id)}
                        >
                            <span style={{ fontWeight: 500 }}>{session.name}</span>
                            <span style={{
                                fontSize: '12px',
                                color: 'var(--text-secondary)',
                                marginLeft: 'auto'
                            }}>
                                {session.puzzleType}
                            </span>
                        </button>
                    ))}
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                    <button
                        className="btn ghost"
                        onClick={() => resolveMerge(null)}
                    >
                        keep separate (create new)
                    </button>
                </div>
            </div>
        </div>,
        document.body
    )
}
