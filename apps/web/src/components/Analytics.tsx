import { useMemo, useState, useEffect } from 'react'
import { useStore } from '../store'
import { SUPPORTED_EVENTS, calculateAverages, getBestAverage } from 'core'
import Plot from 'react-plotly.js'
import ShareModal from './ShareModal'
import {
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar
} from 'recharts'
import { Link } from 'react-router-dom'

/**
 * Formats milliseconds into MM:SS.CC or SS.CC format.
 * @param ms Time in milliseconds
 * @returns Formatted time string
 */
function formatTime(ms: number) {
    const totalSeconds = ms / 1000
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = (totalSeconds % 60).toFixed(2)
    if (minutes === 0) return seconds
    return `${minutes}:${seconds.padStart(5, '0')}`
}

type TimeRange = 'today' | 'week' | 'month' | '3months' | 'year' | 'all'

/**
 * Filters a list of solves by a specific time range relative to now.
 * @param solves List of solve entries
 * @param range Time range to filter by
 * @returns Filtered list of solves
 */
const filterByTime = (solves: import('../store').SolveEntry[], range: string) => {
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

/**
 * Analytics dashboard component.
 * Displays detailed statistics, activity heatmap, progression charts, and time distribution.
 * Allows filtering by session or puzzle type.
 */
export default function Analytics() {
    const [filter, setFilter] = useState<'session' | 'type'>('session')
    const [selectedType, setSelectedType] = useState<string>('333')
    const [progressionTimeRange, setProgressionTimeRange] = useState<TimeRange>('all')
    const [distributionTimeRange, setDistributionTimeRange] = useState<TimeRange>('all')
    const [heatmapYear, setHeatmapYear] = useState(new Date().getFullYear())
    const [hoveredDay, setHoveredDay] = useState<{ date: string, count: number } | null>(null)
    const [visibleSolvesCount, setVisibleSolvesCount] = useState(20)
    const [isShareModalOpen, setIsShareModalOpen] = useState(false)
    const [shareData, setShareData] = useState<{ title?: string, value?: string }>({})

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

    const progressionFilteredSolves = useMemo(() => filterByTime(filteredSolves, progressionTimeRange), [filteredSolves, progressionTimeRange])
    const distributionFilteredSolves = useMemo(() => filterByTime(filteredSolves, distributionTimeRange), [filteredSolves, distributionTimeRange])

    const stats = useMemo(() => {
        const validSolves = filteredSolves.filter(s => s.penalty !== 'DNF')
        const times = validSolves.map(s => s.timeMs + (s.penalty === 'plus2' ? 2000 : 0))

        if (times.length === 0) return null

        const sortedTimes = [...times].sort((a, b) => a - b)
        const mid = Math.floor(sortedTimes.length / 2)
        const median = sortedTimes.length % 2 !== 0
            ? sortedTimes[mid]
            : (sortedTimes[mid - 1] + sortedTimes[mid]) / 2

        const best = Math.min(...times)
        const worst = Math.max(...times)
        const mean = times.reduce((a, b) => a + b, 0) / times.length

        const variance = times.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / times.length
        const stdDev = Math.sqrt(variance)

        const totalTime = times.reduce((a, b) => a + b, 0)

        const first = validSolves[0].timeMs + (validSolves[0].penalty === 'plus2' ? 2000 : 0)
        const improvement = first - best

        const currentAverages = calculateAverages(validSolves)
        const bestAo5 = getBestAverage(validSolves, 5)
        const bestAo12 = getBestAverage(validSolves, 12)
        const bestAo100 = getBestAverage(validSolves, 100)

        return {
            best, worst, mean, median, stdDev, count: filteredSolves.length, totalTime, improvement,
            bestAo5, bestAo12, bestAo100,
            avgAo5: currentAverages.ao5,
            avgAo12: currentAverages.ao12,
            avgAo100: currentAverages.ao100
        }
    }, [filteredSolves])

    const currentTheme = useStore(state => state.currentTheme)
    const [themeColors, setThemeColors] = useState({
        bg: '#011502',
        textPrimary: '#9ec5ab',
        textSecondary: '#32746d',
        accent: '#9ec5ab',
        border: '#104f55'
    })

    // Update colors when theme changes
    useEffect(() => {
        const getVar = (name: string) => getComputedStyle(document.body).getPropertyValue(name).trim()

        const timer = setTimeout(() => {
            setThemeColors({
                bg: getVar('--bg') || '#011502',
                textPrimary: getVar('--text-primary') || '#9ec5ab',
                textSecondary: getVar('--text-secondary') || '#32746d',
                accent: getVar('--accent') || '#9ec5ab',
                border: getVar('--border') || '#104f55'
            })
        }, 50)

        return () => clearTimeout(timer)
    }, [currentTheme])

    const chartData = useMemo(() => {
        return progressionFilteredSolves
            .sort((a, b) => a.timestamp - b.timestamp)
            .map((s, i) => ({
                index: i + 1,
                timestamp: s.timestamp,
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
                    <h2>statistics</h2>
                    <div className="filter-tabs">
                        <button
                            className={`filter-tab ${filter === 'session' ? 'active' : ''}`}
                            onClick={() => setFilter('session')}
                        >
                            by session
                        </button>
                        <button
                            className={`filter-tab ${filter === 'type' ? 'active' : ''}`}
                            onClick={() => setFilter('type')}
                        >
                            by puzzle
                        </button>
                    </div>
                </div>
                <Link to="/" className="close-btn">×</Link>
            </div>

            <ShareModal
                isOpen={isShareModalOpen}
                onClose={() => setIsShareModalOpen(false)}
                title={shareData.title}
                value={shareData.value}
            />

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

            <div className="stats-grid">
                {[
                    { label: 'best single', value: stats ? formatTime(stats.best) : '-', highlight: true },
                    { label: 'best ao5', value: stats && stats.bestAo5 ? formatTime(stats.bestAo5) : '-', highlight: true },
                    { label: 'best ao12', value: stats && stats.bestAo12 ? formatTime(stats.bestAo12) : '-', highlight: true },
                    { label: 'best ao100', value: stats && stats.bestAo100 ? formatTime(stats.bestAo100) : '-', highlight: true },
                    { label: 'median', value: stats ? formatTime(stats.median) : '-' },
                    { label: 'std dev', value: stats ? formatTime(stats.stdDev) : '-' },

                    { label: 'avg single', value: stats ? formatTime(stats.mean) : '-' },
                    { label: 'avg ao5', value: stats && stats.avgAo5 ? formatTime(stats.avgAo5) : '-' },
                    { label: 'avg ao12', value: stats && stats.avgAo12 ? formatTime(stats.avgAo12) : '-' },
                    { label: 'avg ao100', value: stats && stats.avgAo100 ? formatTime(stats.avgAo100) : '-' },
                    { label: 'total solves', value: stats ? stats.count : 0 },
                    { label: 'total time', value: stats ? (stats.totalTime / 1000 / 60).toFixed(1) + 'm' : '0.0m' },
                ].map((stat, i) => (
                    <div key={i} className="stat-card" style={{ position: 'relative' }}>
                        <label>{stat.label}</label>
                        <div className={`value ${stat.highlight ? 'highlight' : ''}`}>{stat.value}</div>
                        <button
                            className="stat-share-btn"
                            onClick={() => {
                                setShareData({ title: stat.label, value: String(stat.value) })
                                setIsShareModalOpen(true)
                            }}
                            aria-label={`Share ${stat.label}`}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z" />
                            </svg>
                        </button>
                    </div>
                ))}
            </div>

            <div className="charts-grid-vertical">
                {/* Activity Heatmap */}
                <div className="chart-card full-width">
                    <div className="chart-header">
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem' }}>
                            <h3>activity</h3>
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
                        <h3>progression</h3>
                        <div className="time-range-selector">
                            {['today', 'week', 'month', '3months', 'year', 'all'].map(range => (
                                <button
                                    key={range}
                                    className={`range-btn ${progressionTimeRange === range ? 'active' : ''}`}
                                    onClick={() => setProgressionTimeRange(range as TimeRange)}
                                >
                                    {range === '3months' ? '3m' : range}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="chart-wrapper">
                        {chartData.length > 0 ? (
                            <Plot
                                data={[
                                    {
                                        x: chartData.map(d => new Date(d.timestamp)),
                                        y: chartData.map(d => d.time),
                                        type: 'scatter',
                                        mode: 'lines+markers',
                                        marker: { color: themeColors.accent, size: 4 },
                                        line: { color: themeColors.accent, width: 2, shape: 'linear' },
                                        fill: 'tozeroy',
                                        fillcolor: themeColors.accent.startsWith('#')
                                            ? `${themeColors.accent}1A`
                                            : themeColors.accent.replace('rgb', 'rgba').replace(')', ', 0.1)'),
                                        hovertemplate: '%{y:.2f}s<br>%{x|%b %d, %Y}<extra></extra>',
                                    }
                                ]}
                                layout={{
                                    autosize: true,
                                    margin: { l: 40, r: 20, t: 20, b: 40 },
                                    paper_bgcolor: 'rgba(0,0,0,0)',
                                    plot_bgcolor: 'rgba(0,0,0,0)',
                                    font: {
                                        family: 'Inter, sans-serif',
                                        color: themeColors.textSecondary
                                    },
                                    xaxis: {
                                        gridcolor: `${themeColors.border}33`,
                                        zerolinecolor: `${themeColors.border}33`,
                                        tickcolor: themeColors.textSecondary,
                                        tickfont: { color: themeColors.textSecondary },
                                        spikethickness: 1,
                                        showspikes: true,
                                        spikemode: 'across',
                                        spikecolor: themeColors.textSecondary,
                                        spikedash: 'dot'
                                    },
                                    yaxis: {
                                        gridcolor: `${themeColors.border}33`,
                                        zerolinecolor: `${themeColors.border}33`,
                                        tickcolor: themeColors.textSecondary,
                                        tickfont: { color: themeColors.textSecondary }
                                    },
                                    hovermode: 'x unified',
                                    showlegend: false
                                }}
                                config={{
                                    displayModeBar: false,
                                    responsive: true
                                }}
                                style={{ width: '100%', height: '100%' }}
                            />
                        ) : (
                            <div className="empty-state">no data for this period</div>
                        )}
                    </div>
                </div>

                {/* Time Distribution Chart */}
                <div className="chart-card full-width">
                    <div className="chart-header">
                        <h3>time distribution</h3>
                        <div className="time-range-selector">
                            {['today', 'week', 'month', '3months', 'year', 'all'].map(range => (
                                <button
                                    key={range}
                                    className={`range-btn ${distributionTimeRange === range ? 'active' : ''}`}
                                    onClick={() => setDistributionTimeRange(range as TimeRange)}
                                >
                                    {range === '3months' ? '3m' : range}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="chart-wrapper">
                        {distributionData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
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
                            <div className="empty-state">no data for this period</div>
                        )}
                    </div>
                </div>
            </div >

            <div className="solves-list-section">
                <h3>all solves</h3>
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
                        load more
                    </button>
                )}
            </div>
        </div >
    )
}
