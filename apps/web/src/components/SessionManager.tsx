import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useStore } from '../store'
import { SUPPORTED_EVENTS, type PuzzleType } from 'core'
import ConfirmationModal from './ConfirmationModal'

/**
 * Component for managing sessions (create, switch, rename, delete).
 * Displays a dropdown for session selection and modals for session operations.
 */
export default function SessionManager() {
    const sessions = useStore(s => s.sessions)
    const currentSessionId = useStore(s => s.currentSessionId)
    const switchSession = useStore(s => s.switchSession)
    const createSession = useStore(s => s.createSession)
    const deleteSession = useStore(s => s.deleteSession)
    const renameSession = useStore(s => s.renameSession)

    const [isCreating, setIsCreating] = useState(false)
    const [isRenaming, setIsRenaming] = useState<string | null>(null)
    const [isDropdownOpen, setIsDropdownOpen] = useState(false)
    const [newName, setNewName] = useState('')
    const [newType, setNewType] = useState<PuzzleType>('3x3')
    const [renameValue, setRenameValue] = useState('')
    const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean, sessionId: string | null }>({
        isOpen: false,
        sessionId: null
    })

    const dropdownRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false)
            }
        }
        if (isDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside)
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [isDropdownOpen])

    const [error, setError] = useState<string | null>(null)

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault()
        if (!newName.trim()) {
            setError('please enter a session name')
            return
        }
        createSession(newName, newType)
        setIsCreating(false)
        setNewName('')
        setNewType('3x3')
        setError(null)
    }

    const handleRename = (e: React.FormEvent) => {
        e.preventDefault()
        if (isRenaming && renameValue.trim()) {
            renameSession(isRenaming, renameValue.trim())
            setIsRenaming(null)
            setRenameValue('')
            setIsDropdownOpen(false)
        }
    }

    const startRename = (e: React.MouseEvent, session: { id: string, name: string }) => {
        e.stopPropagation()
        setIsRenaming(session.id)
        setRenameValue(session.name)
        setIsDropdownOpen(false)
    }

    const handleDeleteClick = (e: React.MouseEvent, id: string) => {
        e.stopPropagation()
        setDeleteConfirmation({ isOpen: true, sessionId: id })
    }

    const confirmDelete = () => {
        if (deleteConfirmation.sessionId) {
            deleteSession(deleteConfirmation.sessionId)
            setDeleteConfirmation({ isOpen: false, sessionId: null })
        }
    }

    const currentSession = sessions.find(s => s.id === currentSessionId)

    return (
        <div className="session-manager">
            <div className="session-selector" ref={dropdownRef} data-tour="session-selector">
                <button
                    className="session-trigger"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                >
                    <span className="session-name">{currentSession?.name || 'session'}</span>
                    <span className="session-type">
                        {SUPPORTED_EVENTS.find(e => e.id === currentSession?.puzzleType)?.name || currentSession?.puzzleType}
                    </span>
                    <svg className={`chevron ${isDropdownOpen ? 'open' : ''}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M6 9l6 6 6-6" />
                    </svg>
                </button>

                {isDropdownOpen && (
                    <div className="session-dropdown">
                        {sessions.map(s => (
                            <div key={s.id} className={`session-option-wrapper ${s.id === currentSessionId ? 'active' : ''}`}>
                                <button
                                    className="session-option-main"
                                    onClick={() => {
                                        switchSession(s.id)
                                        setIsDropdownOpen(false)
                                    }}
                                >
                                    <span className="option-name">{s.name}</span>
                                    <span className="option-type">
                                        {SUPPORTED_EVENTS.find(e => e.id === s.puzzleType)?.name}
                                    </span>
                                </button>
                                <div className="session-actions">
                                    <button
                                        className="action-btn"
                                        onClick={(e) => startRename(e, s)}
                                        title="Rename"
                                    >
                                        ✎
                                    </button>
                                    <button
                                        className="action-btn danger"
                                        onClick={(e) => handleDeleteClick(e, s.id)}
                                        title="Delete"
                                        disabled={sessions.length <= 1}
                                    >
                                        ×
                                    </button>
                                </div>
                            </div>
                        ))}
                        <div className="dropdown-divider" />
                        <button
                            className="session-option create-new"
                            onClick={() => {
                                setIsCreating(true)
                                setIsDropdownOpen(false)
                            }}
                        >
                            + new session
                        </button>
                    </div>
                )}
            </div>

            {/* Create Modal */}
            {isCreating && createPortal(
                <div className="modal-overlay" onClick={() => setIsCreating(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>create session</h3>
                            <button className="close-btn" onClick={() => setIsCreating(false)}>×</button>
                        </div>
                        <form onSubmit={handleCreate}>
                            <div className="form-group">
                                <label>name</label>
                                <input
                                    autoFocus
                                    type="text"
                                    placeholder="e.g. 3x3 main"
                                    value={newName}
                                    onChange={e => {
                                        setNewName(e.target.value)
                                        if (error) setError(null)
                                    }}
                                    className={`input ${error ? 'error' : ''}`}
                                />
                                {error && <span className="error-text" style={{ color: 'var(--error)', fontSize: '12px', marginTop: '4px', display: 'block' }}>{error}</span>}
                            </div>
                            <div className="form-group">
                                <label>puzzle</label>
                                <div className="puzzle-grid">
                                    {SUPPORTED_EVENTS.map(evt => (
                                        <button
                                            key={evt.id}
                                            type="button"
                                            className={`puzzle-option ${newType === evt.id ? 'selected' : ''}`}
                                            onClick={() => setNewType(evt.id)}
                                        >
                                            {evt.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn text" onClick={() => setIsCreating(false)}>cancel</button>
                                <button type="submit" className="btn primary">create</button>
                            </div>
                        </form >
                    </div >
                </div >,
                document.body
            )
            }

            {/* Rename Modal */}
            {
                isRenaming && createPortal(
                    <div className="modal-overlay" onClick={() => setIsRenaming(null)}>
                        <div className="modal" onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3>rename session</h3>
                                <button className="close-btn" onClick={() => setIsRenaming(null)}>×</button>
                            </div>
                            <form onSubmit={handleRename}>
                                <div className="form-group">
                                    <label>name</label>
                                    <input
                                        autoFocus
                                        type="text"
                                        value={renameValue}
                                        onChange={e => setRenameValue(e.target.value)}
                                        className="input"
                                    />
                                </div>
                                <div className="modal-actions">
                                    <button type="button" className="btn text" onClick={() => setIsRenaming(null)}>cancel</button>
                                    <button type="submit" className="btn primary">save</button>
                                </div>
                            </form>
                        </div>
                    </div>,
                    document.body
                )
            }

            <ConfirmationModal
                isOpen={deleteConfirmation.isOpen}
                title="delete session?"
                message="are you sure you want to delete this session? this action cannot be undone."
                confirmLabel="delete"
                isDangerous={true}
                onConfirm={confirmDelete}
                onCancel={() => setDeleteConfirmation({ isOpen: false, sessionId: null })}
            />
        </div >
    )
}
