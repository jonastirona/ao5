import { useMemo, useState } from 'react'
import { useStore } from '../store'
import { SUPPORTED_EVENTS } from 'core'
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar
} from 'recharts'
import { Link } from 'react-router-dom'

function formatTime(ms: number) {
    const totalSeconds = ms / 1000
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = (totalSeconds % 60).toFixed(2)
    if (minutes === 0) return seconds
    return `${minutes}:${seconds.padStart(5, '0')}`
}

export default function Analytics() {
    const [filter, setFilter] = useState<'session' | 'type'>('session')
    const [selectedType, setSelectedType] = useState<string>('333')
    const [progressionTimeRange, setProgressionTimeRange] = useState<'today' | 'week' | 'month' | '3months' | 'year' | 'all'>('all')
    const [distributionTimeRange, setDistributionTimeRange] = useState<'today' | 'week' | 'month' | '3months' | 'year' | 'all'>('all')
    const [heatmapYear, setHeatmapYear] = useState(new Date().getFullYear())
    const [hoveredDay, setHoveredDay] = useState<{ date: string, count: number } | null>(null)
    const [visibleSolvesCount, setVisibleSolvesCount] = useState(20)

    const currentSessionId = useStore(s => s.currentSessionId)
    const sessions = useStore(s => s.sessions)
    const getAllSolves = useStore(s => s.getAllSolves)

    const filteredSolves = useMemo(() => {
        if (filter === 'session') {
            const session = sessions.find(s => s.id === currentSessionId)
            return session ? session.solves : []
        } else {
            return getAllSolves()
                .filter(s => s.puzzleType === selectedType)
                .sort((a, b) => a.timestamp - b.timestamp)
        }
    }, [filter, selectedType, sessions, currentSessionId, getAllSolves])

    // Heatmap Data
    const heatmapData = useMemo(() => {
        const startOfYear = new Date(heatmapYear, 0, 1)
        const endOfYear = new Date(heatmapYear, 11, 31)

        // Map date string (YYYY-MM-DD) to count
        const counts: Record<string, number> = {}
        let maxCount = 0

        filteredSolves.forEach(s => {
            const date = new Date(s.timestamp)
            if (date.getFullYear() === heatmapYear) {
                // Use local date for key to match user's timezone
                const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
                counts[key] = (counts[key] || 0) + 1
                maxCount = Math.max(maxCount, counts[key])
            }
        })

        const weeks = []
        const months = []
        let currentWeek = []
        const currentDate = new Date(startOfYear)

        // Align start date to Sunday
        const dayOfWeek = currentDate.getDay()
        for (let i = 0; i < dayOfWeek; i++) {
            currentWeek.push(null)
        }

        let lastMonth = -1

        while (currentDate <= endOfYear) {
            const key = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`

            // Check for month change
            if (currentDate.getMonth() !== lastMonth) {
                months.push({ name: currentDate.toLocaleString('default', { month: 'short' }), weekIndex: weeks.length })
                lastMonth = currentDate.getMonth()
            }

            currentWeek.push({
                date: key,
                count: counts[key] || 0,
                intensity: counts[key] ? Math.min(4, Math.ceil((counts[key] / maxCount) * 4)) : 0
            })

            if (currentWeek.length === 7) {
                weeks.push(currentWeek)
                currentWeek = []
            }
            currentDate.setDate(currentDate.getDate() + 1)
        }
        if (currentWeek.length > 0) {
            while (currentWeek.length < 7) currentWeek.push(null)
            weeks.push(currentWeek)
        }

        return { weeks, months }
    }, [filteredSolves, heatmapYear])

    // Helper for time filtering
    const filterByTime = (solves: typeof filteredSolves, range: string) => {
        const now = new Date()
        const cutoff = new Date()

        switch (range) {
            case 'today': cutoff.setHours(0, 0, 0, 0); break;
            case 'week': cutoff.setDate(now.getDate() - 7); break;
            case 'month': cutoff.setMonth(now.getMonth() - 1); break;
            case '3months': cutoff.setMonth(now.getMonth() - 3); break;
            case 'year': cutoff.setFullYear(now.getFullYear() - 1); break;
            case 'all': return solves;
        }
        return solves.filter(s => s.timestamp >= cutoff.getTime())
    }

    const progressionFilteredSolves = useMemo(() => filterByTime(filteredSolves, progressionTimeRange), [filteredSolves, progressionTimeRange])
    const distributionFilteredSolves = useMemo(() => filterByTime(filteredSolves, distributionTimeRange), [filteredSolves, distributionTimeRange])

    const stats = useMemo(() => {
        // Stats are based on the global filter (all solves in session/type), not the chart filters
        const validSolves = filteredSolves.filter(s => s.penalty !== 'DNF')
        const times = validSolves.map(s => s.timeMs + (s.penalty === 'plus2' ? 2000 : 0))

        if (times.length === 0) return null

        const best = Math.min(...times)
        const worst = Math.max(...times)
        const mean = times.reduce((a, b) => a + b, 0) / times.length

        // Standard Deviation
        const variance = times.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / times.length
        const stdDev = Math.sqrt(variance)

        const totalTime = times.reduce((a, b) => a + b, 0)

        // Improvement: First valid solve - Best solve
        // Or First valid solve - Last valid solve (trend)
        // Let's do First - Best to show "Max Improvement"
        const first = validSolves[0].timeMs + (validSolves[0].penalty === 'plus2' ? 2000 : 0)
        const improvement = first - best

        return { best, worst, mean, stdDev, count: filteredSolves.length, totalTime, improvement }
    }, [filteredSolves])

    const chartData = useMemo(() => {
        return progressionFilteredSolves.map((s, i) => ({
            index: i + 1,
            time: s.penalty === 'DNF' ? null : (s.timeMs + (s.penalty === 'plus2' ? 2000 : 0)) / 1000,
            date: new Date(s.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
            raw: s
        }))
    }, [progressionFilteredSolves])

    const distributionData = useMemo(() => {
        const validSolves = distributionFilteredSolves.filter(s => s.penalty !== 'DNF')
        const times = validSolves.map(s => (s.timeMs + (s.penalty === 'plus2' ? 2000 : 0)) / 1000)

        if (times.length === 0) return []

        const min = Math.floor(Math.min(...times))
        const max = Math.ceil(Math.max(...times))
        const bins: Record<string, number> = {}

        // Create bins of 1s
        for (let i = min; i <= max; i++) {
            bins[i] = 0
        }

        times.forEach(t => {
            const bin = Math.floor(t)
            if (bins[bin] !== undefined) bins[bin]++
        })

        return Object.entries(bins).map(([bin, count]) => ({
            bin: `${bin}s`,
            count
        }))
    }, [distributionFilteredSolves])

    return (
        <div className="analytics-container">
            <div className="analytics-header">
                <div className="analytics-title">
                    <h2>Statistics</h2>
                    <div className="filter-tabs">
                        <button
                            className={`filter-tab ${filter === 'session' ? 'active' : ''}`}
                            onClick={() => setFilter('session')}
                        >
                            By Session
                        </button>
                        <button
                            className={`filter-tab ${filter === 'type' ? 'active' : ''}`}
                            onClick={() => setFilter('type')}
                        >
                            By Puzzle
                        </button>
                    </div>
                </div>
                <Link to="/" className="close-btn">×</Link>
            </div>



            {filter === 'type' && (
                <div className="type-selector">
                    {SUPPORTED_EVENTS.map(evt => (
                        <button
                            key={evt.id}
                            className={`type-pill ${selectedType === evt.id ? 'active' : ''}`}
                            onClick={() => setSelectedType(evt.id)}
                        >
                            {evt.name}
                        </button>
                    ))}
                </div>
            )}

            {/* Stats Cards - Always show if we have data, or show zeros */}
            <div className="stats-grid">
                <div className="stat-card">
                    <label>Total Solves</label>
                    <div className="value">{stats ? stats.count : 0}</div>
                </div>
                <div className="stat-card">
                    <label>Best Time</label>
                    <div className="value highlight">{stats ? formatTime(stats.best) : '-'}</div>
                </div>
                <div className="stat-card">
                    <label>Worst Time</label>
                    <div className="value">{stats ? formatTime(stats.worst) : '-'}</div>
                </div>
                <div className="stat-card">
                    <label>Average Mean</label>
                    <div className="value">{stats ? formatTime(stats.mean) : '-'}</div>
                </div>
                <div className="stat-card">
                    <label>Standard Dev</label>
                    <div className="value">{stats ? formatTime(stats.stdDev) : '-'}</div>
                </div>
                <div className="stat-card">
                    <label>Total Time</label>
                    <div className="value">{stats ? (stats.totalTime / 1000 / 60).toFixed(1) : '0.0'}m</div>
                </div>
            </div>

            <div className="charts-grid-vertical">
                {/* Activity Heatmap */}
                <div className="chart-card full-width">
                    <div className="chart-header">
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem' }}>
                            <h3>Activity</h3>
                            {hoveredDay && (
                                <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono' }}>
                                    {new Date(hoveredDay.date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}:
                                    <strong style={{ color: 'var(--text-primary)', marginLeft: '4px' }}>
                                        {hoveredDay.count} solve{hoveredDay.count !== 1 ? 's' : ''}
                                    </strong>
                                </span>
                            )}
                        </div>
                        <div className="heatmap-nav">
                            <button onClick={() => setHeatmapYear(y => y - 1)} className="nav-btn">←</button>
                            <span>{heatmapYear}</span>
                            <button onClick={() => setHeatmapYear(y => y + 1)} className="nav-btn" disabled={heatmapYear >= new Date().getFullYear()}>→</button>
                        </div>
                    </div>
                    <div className="activity-heatmap-wrapper">
                        <div className="heatmap-labels-row">
                            <div className="heatmap-y-axis-placeholder"></div>
                            <div className="heatmap-months">
                                {heatmapData.months.map((m, i) => (
                                    <span key={i} style={{ gridColumnStart: m.weekIndex + 1 }}>{m.name}</span>
                                ))}
                            </div>
                        </div>
                        <div className="heatmap-body">
                            <div className="heatmap-days">
                                <span>Mon</span>
                                <span>Wed</span>
                                <span>Fri</span>
                            </div>
                            <div className="activity-heatmap">
                                {heatmapData.weeks.map((week, i) => (
                                    <div key={i} className="heatmap-week">
                                        {week.map((day, j) => (
                                            <div
                                                key={j}
                                                className={`heatmap-cell ${day ? `intensity-${day.intensity}` : 'empty'}`}
                                                onMouseEnter={() => day && setHoveredDay({ date: day.date, count: day.count })}
                                                onMouseLeave={() => setHoveredDay(null)}
                                            />
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Progression Chart */}
                <div className="chart-card full-width">
                    <div className="chart-header">
                        <h3>Progression</h3>
                        <div className="time-range-selector">
                            {['today', 'week', 'month', '3months', 'year', 'all'].map(range => (
                                <button
                                    key={range}
                                    className={`range-btn ${progressionTimeRange === range ? 'active' : ''}`}
                                    onClick={() => setProgressionTimeRange(range as any)}
                                >
                                    {range === '3months' ? '3M' : range.charAt(0).toUpperCase() + range.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="chart-wrapper">
                        {chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                                    <XAxis dataKey="date" stroke="var(--text-secondary)" minTickGap={30} />
                                    <YAxis domain={['auto', 'auto']} stroke="var(--text-secondary)" />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8 }}
                                        labelStyle={{ color: 'var(--text-secondary)' }}
                                    />
                                    <Line type="monotone" dataKey="time" stroke="var(--accent)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="empty-state">No data for this period</div>
                        )}
                    </div>
                </div>

                {/* Time Distribution Chart */}
                <div className="chart-card full-width">
                    <div className="chart-header">
                        <h3>Time Distribution</h3>
                        <div className="time-range-selector">
                            {['today', 'week', 'month', '3months', 'year', 'all'].map(range => (
                                <button
                                    key={range}
                                    className={`range-btn ${distributionTimeRange === range ? 'active' : ''}`}
                                    onClick={() => setDistributionTimeRange(range as any)}
                                >
                                    {range === '3months' ? '3M' : range.charAt(0).toUpperCase() + range.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="chart-wrapper">
                        {distributionData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={distributionData}>
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                                    <XAxis dataKey="bin" stroke="var(--text-secondary)" />
                                    <YAxis stroke="var(--text-secondary)" />
                                    <Tooltip
                                        cursor={{ fill: 'var(--text-secondary)', opacity: 0.1 }}
                                        contentStyle={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8 }}
                                    />
                                    <Bar dataKey="count" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="empty-state">No data for this period</div>
                        )}
                    </div>
                </div>

                {/* Solves List */}
                <div className="solves-list-section">
                    <h3>All Solves</h3>
                    <div className="analytics-solves-list">
                        {filteredSolves
                            .slice()
                            .sort((a, b) => b.timestamp - a.timestamp)
                            .slice(0, visibleSolvesCount)
                            .map((solve, i) => (
                                <div key={solve.id} className="solve-item">
                                    <div className="solve-left">
                                        <span className="solve-index">{filteredSolves.length - i}</span>
                                        <span className="solve-time">
                                            {solve.penalty === 'DNF' ? 'DNF' : formatTime(solve.timeMs + (solve.penalty === 'plus2' ? 2000 : 0))}
                                            {solve.penalty === 'plus2' && '+'}
                                        </span>
                                        <span className="solve-date">{new Date(solve.timestamp).toLocaleDateString()}</span>
                                    </div>
                                    <div className="solve-scramble-small">{solve.scramble}</div>
                                </div>
                            ))}
                    </div>
                    {visibleSolvesCount < filteredSolves.length && (
                        <button
                            className="btn ghost full-width"
                            onClick={() => setVisibleSolvesCount(c => c + 20)}
                            style={{ marginTop: '1rem' }}
                        >
                            Load More
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
