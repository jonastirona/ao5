

interface ConfirmationModalProps {
    isOpen: boolean
    title: string
    message: string
    confirmLabel: string
    onConfirm: () => void
    onCancel: () => void
    isDangerous?: boolean
}

export default function ConfirmationModal({
    isOpen,
    title,
    message,
    confirmLabel,
    onConfirm,
    onCancel,
    isDangerous = false,
}: ConfirmationModalProps) {
    if (!isOpen) return null

    return (
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
            zIndex: 1000,
            backdropFilter: 'blur(4px)'
        }}>
            <div className="modal-content" style={{
                backgroundColor: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '24px',
                maxWidth: '400px',
                width: '90%',
                boxShadow: 'var(--shadow)'
            }}>
                <h3 style={{ marginTop: 0, color: isDangerous ? 'var(--error, #ff4d4d)' : 'var(--text-primary)' }}>{title}</h3>
                <p style={{ color: 'var(--text-secondary)', lineHeight: '1.5' }}>{message}</p>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                    <button
                        className="btn ghost"
                        onClick={onCancel}
                    >
                        cancel
                    </button>
                    <button
                        className={`btn ${isDangerous ? 'danger' : 'primary'}`}
                        onClick={onConfirm}
                        style={isDangerous ? { backgroundColor: 'rgba(255, 77, 77, 0.1)', color: '#ff4d4d', border: '1px solid transparent' } : {}}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    )
}
