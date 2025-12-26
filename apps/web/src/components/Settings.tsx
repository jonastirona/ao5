import { Link, useNavigate } from 'react-router-dom'
import ThemeSelector from './ThemeSelector'
import PWAInstall from './Settings/PWAInstall'
import { useStore } from '../store'
import { useState } from 'react'
import { exportAllSessionsToJSON, parseImport } from '../lib/importExport'
import { useFocusTrap } from '../hooks/useFocusTrap'

/**
 * Settings page component.
 * Allows users to configure timer settings, manage data (import/export), and change themes.
 */
export default function Settings() {
    const settings = useStore(s => s.settings)
    const updateSettings = useStore(s => s.updateSettings)
    const sessions = useStore(s => s.sessions)
    const addSession = useStore(s => s.addSession)
    const navigate = useNavigate()

    const [importError, setImportError] = useState<string | null>(null)
    const [importSuccess, setImportSuccess] = useState<string | null>(null)

    const containerRef = useFocusTrap(true, () => navigate('/'))

    const handleExport = () => {
        const content = exportAllSessionsToJSON(sessions)
        const blob = new Blob([content], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `ao5-backup-${new Date().toISOString().split('T')[0]}.json`
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
            setImportSuccess(`imported ${totalSessions} session(s) with ${totalSolves} solve(s).`)
            setImportError(null)
            setTimeout(() => setImportSuccess(null), 5000)
        } else if (errors > 0) {
            setImportError('failed to import sessions. check file format.')
            setImportSuccess(null)
            setTimeout(() => setImportError(null), 3000)
        } else {
            // No sessions found, but no errors (e.g. empty file or empty sessions)
            setImportSuccess('no valid sessions found to import.')
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
        <div
            className={`settings-container ${isDragging ? 'dragging-global' : ''}`}
            ref={containerRef}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <div className="settings-header">
                <h2>settings</h2>
                <Link to="/" className="close-btn">×</Link>
            </div>

            <div className="settings-layout">
                <div className="settings-row">
                    <section className="settings-section">
                        <h3>timer</h3>
                        <div className="setting-item">
                            <div className="setting-info">
                                <label>inspection</label>
                                <p>enable wca-style inspection phase</p>
                            </div>
                            <label className="toggle-switch">
                                <input
                                    type="checkbox"
                                    checked={settings.inspectionEnabled}
                                    onChange={(e) => updateSettings({ inspectionEnabled: e.target.checked })}
                                    aria-label="Enable inspection"
                                />
                                <span className="slider"></span>
                            </label>
                        </div>

                        {settings.inspectionEnabled && (
                            <div className="setting-item">
                                <div className="setting-info">
                                    <label>inspection duration</label>
                                    <p>time in seconds (default 15s)</p>
                                </div>
                                <div className="setting-control">
                                    <input
                                        type="number"
                                        value={settings.inspectionDuration / 1000}
                                        onChange={(e) => updateSettings({ inspectionDuration: Number(e.target.value) * 1000 })}
                                        className="input small"
                                        min="0"
                                        max="60"
                                        aria-label="Inspection duration in seconds"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="setting-item">
                            <div className="setting-info">
                                <label>scramble image</label>
                                <p>show 2d or 3d visualization of the scramble</p>
                            </div>
                            <label className="toggle-switch">
                                <input
                                    type="checkbox"
                                    checked={settings.showScrambleImage}
                                    onChange={(e) => updateSettings({ showScrambleImage: e.target.checked })}
                                    aria-label="Show scramble image"
                                />
                                <span className="slider"></span>
                            </label>
                        </div>

                        {settings.showScrambleImage && (
                            <>
                                <div className="setting-item">
                                    <div className="setting-info">
                                        <label>visualization type</label>
                                        <p>choose between 2d or interactive 3d model</p>
                                    </div>
                                    <div className="segmented-control">
                                        <button
                                            className={`segment ${!settings.scrambleVisualization3D ? 'active' : ''}`}
                                            onClick={() => updateSettings({ scrambleVisualization3D: false })}
                                            aria-pressed={!settings.scrambleVisualization3D}
                                        >
                                            2d
                                        </button>
                                        <button
                                            className={`segment ${settings.scrambleVisualization3D ? 'active' : ''}`}
                                            onClick={() => updateSettings({ scrambleVisualization3D: true })}
                                            aria-pressed={settings.scrambleVisualization3D}
                                        >
                                            3d
                                        </button>
                                    </div>
                                </div>
                                <div className="setting-item">
                                    <div className="setting-info">
                                        <label>image size</label>
                                        <p>scale: {settings.scrambleImageScale || 1}x</p>
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
                                            aria-label="Scramble image scale"
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        <div className="setting-item">
                            <div className="setting-info">
                                <label>pb effects</label>
                                <p>show animations for new personal bests</p>
                            </div>
                            <label className="toggle-switch">
                                <input
                                    type="checkbox"
                                    checked={settings.pbEffectsEnabled ?? true}
                                    onChange={(e) => updateSettings({ pbEffectsEnabled: e.target.checked })}
                                    aria-label="Enable PB effects"
                                />
                                <span className="slider"></span>
                            </label>
                        </div>
                    </section>

                    <section className="settings-section">
                        <h3>data</h3>
                        <div className="data-actions-col">
                            <div className="data-group">
                                <h4>export data</h4>
                                <div className="button-group">
                                    <button className="btn full-width" onClick={handleExport}>export all sessions (cstimer format)</button>
                                </div>
                            </div>

                            <div className="data-group">
                                <h4>import sessions</h4>
                                <div
                                    className={`drop-zone ${isDragging ? 'dragging' : ''}`}
                                >
                                    <div className="file-input-wrapper full-width">
                                        <button className="btn ghost full-width">
                                            {isDragging ? 'drop files here' : 'select or drop files (json, csv, txt)'}
                                        </button>
                                        <input type="file" accept=".json,.csv,.txt" onChange={handleImport} multiple />
                                    </div>
                                </div>
                                <p className="hint">supports cstimer backup files. for other formats, please submit a request via feedback.</p>
                            </div>
                        </div>
                        {importSuccess && <div className="toast success" style={{ position: 'static', marginTop: '1rem' }}>{importSuccess}</div>}
                        {importError && <div className="toast error" style={{ position: 'static', marginTop: '1rem' }}>{importError}</div>}
                    </section>
                </div>

                <section className="settings-section full-width">
                    <h3>appearance</h3>
                    <ThemeSelector />
                </section>

                <section className="settings-section full-width">
                    <PWAInstall />
                </section>
            </div>
        </div>
    )
}
