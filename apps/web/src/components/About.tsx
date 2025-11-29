import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function About() {
    const [globalStats, setGlobalStats] = useState({
        totalSolves: 0,
        totalUsers: 0,
        totalTime: 0,
        concurrentUsers: 1
    })

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const { count: solvesCount } = await supabase.from('solves').select('*', { count: 'exact', head: true })
                const { count: usersCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true })

                const { data: timeData } = await supabase.from('solves').select('time_ms')
                const totalTime = timeData?.reduce((acc, curr) => acc + (curr.time_ms || 0), 0) || 0

                setGlobalStats({
                    totalSolves: solvesCount || 0,
                    totalUsers: usersCount || 0,
                    totalTime,
                    concurrentUsers: 1 // Placeholder as we don't have realtime presence yet
                })
            } catch (e) {
                console.error('Failed to fetch global stats', e)
            }
        }
        fetchStats()
    }, [])

    return (
        <div className="settings-container">
            <div className="about-content">
                <div className="about-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2>About ao5</h2>
                        <p>A modern, minimalist speedcubing timer.</p>
                    </div>
                    <Link to="/" className="close-btn">×</Link>
                </div>

                <div className="settings-section">
                    <h3>Global Stats</h3>
                    <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
                        <div className="stat-card">
                            <label>Total Solves</label>
                            <div className="value">{globalStats.totalSolves.toLocaleString()}</div>
                        </div>
                        <div className="stat-card">
                            <label>Total Time</label>
                            <div className="value">{(globalStats.totalTime / 1000 / 60 / 60 / 24).toFixed(1)}d</div>
                        </div>
                        <div className="stat-card">
                            <label>Total Users</label>
                            <div className="value">{globalStats.totalUsers.toLocaleString()}</div>
                        </div>
                        <div className="stat-card">
                            <label>Concurrent</label>
                            <div className="value">{globalStats.concurrentUsers.toLocaleString()}</div>
                        </div>
                    </div>

                    <h3>Controls</h3>
                    <ul className="keybindings-list">
                        <li>
                            <kbd>Space</kbd>
                            <span>Start/Stop Timer</span>
                        </li>
                        <li>
                            <kbd>Esc</kbd>
                            <span>Reset / Cancel Inspection</span>
                        </li>
                        <li>
                            <div className="key-combo">
                                <kbd>Alt</kbd> + <kbd>2</kbd>
                            </div>
                            <span>+2 Penalty</span>
                        </li>
                        <li>
                            <div className="key-combo">
                                <kbd>Alt</kbd> + <kbd>D</kbd>
                            </div>
                            <span>DNF Solve</span>
                        </li>
                        <li>
                            <div className="key-combo">
                                <kbd>Alt</kbd> + <kbd>Z</kbd>
                            </div>
                            <span>Delete Last Solve</span>
                        </li>
                    </ul>
                </div>

                <div className="settings-section">
                    <h3>Credits</h3>
                    <div className="credits-list">
                        <div className="credit-item">
                            <strong>Design & Development</strong>
                            <p>Built with React, Zustand, and Supabase.</p>
                        </div>
                        <div className="credit-item">
                            <strong>Inspiration</strong>
                            <p>
                                Inspired by <a href="https://monkeytype.com" target="_blank" rel="noopener noreferrer">Monkeytype</a> and <a href="https://cstimer.net" target="_blank" rel="noopener noreferrer">csTimer</a>.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="about-footer">
                    <p>v0.1.0 • <a href="https://github.com/jonastirona/ao5" target="_blank" rel="noopener noreferrer">GitHub</a></p>
                </div>
            </div>
        </div>
    )
}
