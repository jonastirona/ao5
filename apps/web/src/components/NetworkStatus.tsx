import { useState, useEffect } from 'react'
import { useAuth } from '../authStore'
import { useStore } from '../store'

export default function NetworkStatus() {
    const [isOffline, setIsOffline] = useState(!navigator.onLine)
    const [showSyncNotification, setShowSyncNotification] = useState(false)
    const [showInfo, setShowInfo] = useState(false)
    const lastSyncTime = useAuth(s => s.lastSyncTime)
    // Calculate pending count directly from store based on synced flag
    const pendingCount = useStore(s => s.sessions.flatMap(sess => sess.solves).filter(solve => solve.synced === false).length)
    const user = useAuth(s => s.user)

    useEffect(() => {
        const handleOnline = () => setIsOffline(false)
        const handleOffline = () => setIsOffline(true)

        window.addEventListener('online', handleOnline)
        window.addEventListener('offline', handleOffline)

        return () => {
            window.removeEventListener('online', handleOnline)
            window.removeEventListener('offline', handleOffline)
        }
    }, [])

    useEffect(() => {
        if (lastSyncTime && !isOffline) {
            setShowSyncNotification(true)
            const timer = setTimeout(() => setShowSyncNotification(false), 3000)
            return () => clearTimeout(timer)
        }
    }, [lastSyncTime, isOffline])

    if (!isOffline && !showSyncNotification && !showInfo) return null

    return (
        <div className="network-status-container">
            {showInfo && (
                <div className="status-info-panel">
                    <div className="panel-header">
                        <span>network status</span>
                        <button onClick={() => setShowInfo(false)} className="close-btn">×</button>
                    </div>
                    <div className="panel-row">
                        <span className="label">status</span>
                        <span className={`value ${isOffline ? 'offline' : 'online'}`}>
                            {isOffline ? 'offline' : 'online'}
                        </span>
                    </div>
                    <div className="panel-row">
                        <span className="label">account</span>
                        <span className="value">{user?.email || 'not logged in'}</span>
                    </div>
                    <div className="panel-row">
                        <span className="label">last sync</span>
                        <span className="value">
                            {lastSyncTime ? new Date(lastSyncTime).toLocaleTimeString() : 'never'}
                        </span>
                    </div>
                    <div className="panel-row">
                        <span className="label">pending uploads</span>
                        <span className="value">{pendingCount}</span>
                    </div>
                    {isOffline && (
                        <div className="offline-warning">
                            you are offline, solves may not sync correctly to db
                        </div>
                    )}
                </div>
            )}

            <div className="status-badges" onClick={() => setShowInfo(!showInfo)}>
                {isOffline && (
                    <div className="status-badge offline">
                        <span className="dot"></span>
                        offline
                    </div>
                )}
                {(!isOffline && (showSyncNotification || showInfo)) && (
                    <div className="status-badge synced">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        {showSyncNotification ? 'synced' : 'connected'}
                    </div>
                )}
            </div>
            <style>{`
                .network-status-container {
                    position: fixed;
                    bottom: 2rem;
                    right: 2rem;
                    z-index: 1000;
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                    align-items: flex-end;
                }
                .status-badges {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                    cursor: pointer;
                    pointer-events: auto;
                }
                .status-badge {
                    background: var(--bg);
                    border: 1px solid var(--border);
                    padding: 0.5rem 1rem;
                    border-radius: 2rem;
                    font-size: 0.875rem;
                    color: var(--text-secondary);
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                    animation: slideIn 0.3s ease-out;
                    transition: all 0.2s;
                }
                .status-badge:hover {
                    transform: translateY(-2px);
                    border-color: var(--text-secondary);
                }
                .status-info-panel {
                    background: var(--bg);
                    border: 1px solid var(--border);
                    border-radius: 12px;
                    padding: 1rem;
                    width: 320px;
                    box-shadow: 0 8px 24px rgba(0,0,0,0.3);
                    margin-bottom: 0.5rem;
                    animation: slideIn 0.2s ease-out;
                    pointer-events: auto;
                }
                .panel-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 1rem;
                    font-weight: 600;
                    color: var(--text-primary);
                    text-transform: uppercase;
                    font-size: 0.75rem;
                    letter-spacing: 0.05em;
                }
                .panel-row {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 0.5rem;
                    font-size: 0.875rem;
                }
                .panel-row:last-child {
                    margin-bottom: 0;
                }
                .panel-row .label {
                    color: var(--text-secondary);
                }
                .panel-row .value {
                    color: var(--text-primary);
                    font-family: 'JetBrains Mono', monospace;
                    max-width: 180px;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    text-align: right;
                }
                .panel-row .value.offline { color: #ef4444; }
                .panel-row .value.online { color: var(--accent); }
                .close-btn {
                    background: none;
                    border: none;
                    color: var(--text-secondary);
                    cursor: pointer;
                    font-size: 1.2rem;
                    padding: 0;
                    line-height: 1;
                }
                .close-btn:hover { color: var(--text-primary); }
                .status-badge.offline {
                    border-color: #ef4444;
                    color: #ef4444;
                }
                .status-badge.synced {
                    border-color: var(--accent);
                    color: var(--accent);
                }
                .dot {
                    width: 8px;
                    height: 8px;
                    background: currentColor;
                    border-radius: 50%;
                }
                @keyframes slideIn {
                    from { transform: translateY(100%); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                .offline-warning {
                    margin-top: 1rem;
                    padding: 0.75rem;
                    background: rgba(239, 68, 68, 0.1);
                    border: 1px solid rgba(239, 68, 68, 0.2);
                    border-radius: 8px;
                    color: #ef4444;
                    font-size: 0.75rem;
                    line-height: 1.4;
                    text-align: center;
                }
            `}</style>
        </div>
    )
}
