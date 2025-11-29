import { Link } from 'react-router-dom'
import ThemeSelector from './ThemeSelector'
import { useStore } from '../store'
import { useState } from 'react'
import { exportSessionToJSON, exportSessionToCSV, exportSessionToText, parseImport } from '../lib/importExport'

export default function Settings() {
    const settings = useStore(s => s.settings)
    const updateSettings = useStore(s => s.updateSettings)
    const sessions = useStore(s => s.sessions)
    const currentSessionId = useStore(s => s.currentSessionId)
    const addSession = useStore(s => s.addSession)

    const [importError, setImportError] = useState<string | null>(null)
    const [importSuccess, setImportSuccess] = useState<string | null>(null)

    const handleExport = (format: 'json' | 'csv' | 'txt') => {
        const currentSession = sessions.find(s => s.id === currentSessionId)
        if (!currentSession) return

        let content = ''
        let mimeType = ''
        let extension = ''

        switch (format) {
            case 'json':
                content = exportSessionToJSON(currentSession)
                mimeType = 'application/json'
                extension = 'json'
                break
            case 'csv':
                content = exportSessionToCSV(currentSession)
                mimeType = 'text/csv'
                extension = 'csv'
                break
            case 'txt':
                content = exportSessionToText(currentSession)
                mimeType = 'text/plain'
                extension = 'txt'
                break
        }

        const blob = new Blob([content], { type: mimeType })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `ao5-session-${currentSession.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-${new Date().toISOString().split('T')[0]}.${extension}`
        a.click()
        URL.revokeObjectURL(url)
    }

    const [isDragging, setIsDragging] = useState(false)

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(true)
    }

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
    }

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)

        const files = e.dataTransfer.files
        if (!files || files.length === 0) return

        await processFiles(files)
    }

    const processFiles = async (files: FileList) => {
        let totalSessions = 0
        let totalSolves = 0
        let errors = 0

        for (let i = 0; i < files.length; i++) {
            const file = files[i]
            try {
                const text = await file.text()
                const newSessions = parseImport(text, file.name)

                if (newSessions.length > 0) {
                    newSessions.forEach(s => {
                        // Only add non-empty sessions
                        if (s.solves.length > 0) {
                            addSession(s)
                            totalSessions++
                            totalSolves += s.solves.length
                        }
                    })
                } else {
                    // If parseImport returns empty array, it might be a blank file or invalid format
                    // But we don't want to error if it was just a blank valid file
                }
            } catch (err) {
                console.error(err)
                errors++
            }
        }

        if (totalSessions > 0) {
            setImportSuccess(`Imported ${totalSessions} session(s) with ${totalSolves} solve(s).`)
            setImportError(null)
            setTimeout(() => setImportSuccess(null), 5000)
        } else if (errors > 0) {
            setImportError('Failed to import sessions. Check file format.')
            setImportSuccess(null)
            setTimeout(() => setImportError(null), 3000)
        } else {
            // No sessions found, but no errors (e.g. empty file or empty sessions)
            setImportSuccess('No valid sessions found to import.')
            setTimeout(() => setImportSuccess(null), 3000)
        }
    }

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (!files || files.length === 0) return
        await processFiles(files)
        // Reset input
        e.target.value = ''
    }

    return (
        <div className="settings-container">
            <div className="settings-header">
                <h2>Settings</h2>
                <Link to="/" className="close-btn">×</Link>
            </div>

            <div className="settings-layout">
                <div className="settings-row">
                    <section className="settings-section">
                        <h3>Timer</h3>
                        <div className="setting-item">
                            <div className="setting-info">
                                <label>Inspection</label>
                                <p>Enable WCA-style inspection phase</p>
                            </div>
                            <label className="toggle-switch">
                                <input
                                    type="checkbox"
                                    checked={settings.inspectionEnabled}
                                    onChange={(e) => updateSettings({ inspectionEnabled: e.target.checked })}
                                />
                                <span className="slider"></span>
                            </label>
                        </div>

                        {settings.inspectionEnabled && (
                            <div className="setting-item">
                                <div className="setting-info">
                                    <label>Inspection Duration</label>
                                    <p>Time in seconds (default 15s)</p>
                                </div>
                                <div className="setting-control">
                                    <input
                                        type="number"
                                        value={settings.inspectionDuration / 1000}
                                        onChange={(e) => updateSettings({ inspectionDuration: Number(e.target.value) * 1000 })}
                                        className="input small"
                                        min="0"
                                        max="60"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="setting-item">
                            <div className="setting-info">
                                <label>Scramble Image</label>
                                <p>Show 3D visualization of the scramble</p>
                            </div>
                            <label className="toggle-switch">
                                <input
                                    type="checkbox"
                                    checked={settings.showScrambleImage}
                                    onChange={(e) => updateSettings({ showScrambleImage: e.target.checked })}
                                />
                                <span className="slider"></span>
                            </label>
                        </div>

                        {settings.showScrambleImage && (
                            <div className="setting-item">
                                <div className="setting-info">
                                    <label>Image Size</label>
                                    <p>Scale: {settings.scrambleImageScale || 1}x</p>
                                </div>
                                <div className="setting-control">
                                    <input
                                        type="range"
                                        min="0.5"
                                        max="2.0"
                                        step="0.1"
                                        value={settings.scrambleImageScale || 1}
                                        onChange={(e) => updateSettings({ scrambleImageScale: parseFloat(e.target.value) })}
                                        className="range-input"
                                    />
                                </div>
                            </div>
                        )}
                    </section>

                    <section className="settings-section">
                        <h3>Data</h3>
                        <div className="data-actions-col">
                            <div className="data-group">
                                <h4>Export Current Session</h4>
                                <div className="button-group">
                                    <button className="btn" onClick={() => handleExport('json')}>JSON</button>
                                    <button className="btn" onClick={() => handleExport('csv')}>CSV</button>
                                    <button className="btn" onClick={() => handleExport('txt')}>Text</button>
                                </div>
                            </div>

                            <div className="data-group">
                                <h4>Import Sessions</h4>
                                <div
                                    className={`drop-zone ${isDragging ? 'dragging' : ''}`}
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                >
                                    <div className="file-input-wrapper full-width">
                                        <button className="btn ghost full-width">
                                            {isDragging ? 'Drop files here' : 'Select or Drop Files (JSON, CSV, TXT)'}
                                        </button>
                                        <input type="file" accept=".json,.csv,.txt" onChange={handleImport} multiple />
                                    </div>
                                </div>
                                <p className="hint">Supports ao5 JSON, csTimer, CubeDesk, Flowtimer CSV, and plain text.</p>
                            </div>
                        </div>
                        {importSuccess && <div className="toast success" style={{ position: 'static', marginTop: '1rem' }}>{importSuccess}</div>}
                        {importError && <div className="toast error" style={{ position: 'static', marginTop: '1rem' }}>{importError}</div>}
                    </section>
                </div>

                <section className="settings-section full-width">
                    <h3>Appearance</h3>
                    <ThemeSelector />
                </section>
            </div>
        </div>
    )
}
