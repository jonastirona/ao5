import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useStore } from '../store'

export default function About() {
    const concurrentUsers = useStore(s => s.concurrentUsers)
    const [globalStats, setGlobalStats] = useState({
        totalSolves: 0,
        totalUsers: 0,
        totalTime: 0,
    })

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const { count: solvesCount } = await supabase.from('solves').select('*', { count: 'exact', head: true })
                const { count: usersCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true })

                const { data: timeData } = await supabase.from('solves').select('time_ms')
                const totalTime = timeData?.reduce((acc, curr) => acc + (curr.time_ms || 0), 0) || 0

                setGlobalStats(prev => ({
                    ...prev,
                    totalSolves: solvesCount || 0,
                    totalUsers: usersCount || 0,
                    totalTime,
                }))
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
                        <h2>about ao5</h2>
                        <p>a modern, minimalist speedcubing timer.</p>
                    </div>
                    <Link to="/" className="close-btn">×</Link>
                </div>

                <div className="settings-section">
                    <h3>global stats</h3>
                    <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
                        <div className="stat-card">
                            <label>total solves</label>
                            <div className="value">{globalStats.totalSolves.toLocaleString()}</div>
                        </div>
                        <div className="stat-card">
                            <label>total time</label>
                            <div className="value">{(globalStats.totalTime / 1000 / 60 / 60 / 24).toFixed(1)}d</div>
                        </div>
                        <div className="stat-card">
                            <label>total users</label>
                            <div className="value">{globalStats.totalUsers.toLocaleString()}</div>
                        </div>
                        <div className="stat-card">
                            <label>concurrent</label>
                            <div className="value">{concurrentUsers.toLocaleString()}</div>
                        </div>
                    </div>

                    <h3>controls</h3>
                    <ul className="keybindings-list">
                        <li>
                            <kbd>space</kbd>
                            <span>start/stop timer</span>
                        </li>
                        <li>
                            <kbd>esc</kbd>
                            <span>reset / cancel inspection</span>
                        </li>
                        <li>
                            <div className="key-combo">
                                <kbd>alt / opt</kbd> + <kbd>2</kbd>
                            </div>
                            <span>+2 penalty</span>
                        </li>
                        <li>
                            <div className="key-combo">
                                <kbd>alt / opt</kbd> + <kbd>d</kbd>
                            </div>
                            <span>dnf solve</span>
                        </li>
                        <li>
                            <div className="key-combo">
                                <kbd>alt / opt</kbd> + <kbd>z</kbd>
                            </div>
                            <span>delete last solve</span>
                        </li>
                    </ul>
                </div>

                <div className="settings-section">
                    <h3>credits</h3>
                    <div className="credits-list">
                        <div className="credit-item">
                            <strong>design & development</strong>
                            <p>built with react, zustand, and supabase.</p>
                        </div>
                        <div className="credit-item">
                            <strong>inspiration</strong>
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
