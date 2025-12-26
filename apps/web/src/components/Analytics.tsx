import { useRef, useMemo, useState, useEffect } from 'react'
import { useStore } from '../store'
import { SUPPORTED_EVENTS, calculateAverages, getBestAverage, computeTrimmedAverage } from 'core'
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

// ... (keep formatTime and filterByTime helper functions same as original)

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

    // Rolling Average Toggles
    const [showAo5, setShowAo5] = useState(false)
    const [showAo12, setShowAo12] = useState(false)
    const [showAo100, setShowAo100] = useState(false)
    const [lineMode, setLineMode] = useState<'none' | 'trend' | 'connect'>('trend') // Default to trend
    const [resetCount, setResetCount] = useState(0)

    const currentSessionId = useStore(s => s.currentSessionId)
    const sessions = useStore(s => s.sessions)
    const getAllSolves = useStore(s => s.getAllSolves)

    // Base set of solves (Session or Type)
    const allRelevantSolves = useMemo(() => {
        if (filter === 'session') {
            const session = sessions.find(s => s.id === currentSessionId)
            return session ? session.solves : []
        } else {
            return getAllSolves()
                .filter(s => s.puzzleType === selectedType)
                .sort((a, b) => a.timestamp - b.timestamp)
        }
    }, [filter, selectedType, sessions, currentSessionId, getAllSolves])

    // Calculate Rolling Averages globally to ensure context is preserved
    const solvesWithAverages = useMemo(() => {
        const sorted = [...allRelevantSolves].sort((a, b) => a.timestamp - b.timestamp)

        return sorted.map((s, i) => {
            const windowEnd = i + 1
            // Optimization: slice last 100 for performance
            const start = Math.max(0, windowEnd - 100)
            const subset = sorted.slice(start, windowEnd)

            return {
                ...s,
                rollingAo5: computeTrimmedAverage(subset, 5),
                rollingAo12: computeTrimmedAverage(subset, 12),
                rollingAo100: computeTrimmedAverage(subset, 100)
            }
        })
    }, [allRelevantSolves])

    // Filter for Heatmap (using base relevant solves is fine)
    const filteredSolves = allRelevantSolves;

    // ... (keep Heatmap Data logic same as original, lines 85-146) 

    // WAIT: I cannot replace the whole block easily. 
    // I will replace just the `filteredSolves` definition and add the new computations.

    // ... (keep Heatmap Data logic same as original, lines 85-146) 
    const heatmapData = useMemo(() => {
        const startOfYear = new Date(heatmapYear, 0, 1)
        const endOfYear = new Date(heatmapYear, 11, 31)

        const counts: Record<string, number> = {}
        let maxCount = 0

        filteredSolves.forEach(s => {
            const date = new Date(s.timestamp)
            if (date.getFullYear() === heatmapYear) {
                const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
                counts[key] = (counts[key] || 0) + 1
                maxCount = Math.max(maxCount, counts[key])
            }
        })

        const weeks = []
        const months = []
        let currentWeek = []
        const currentDate = new Date(startOfYear)

        const dayOfWeek = currentDate.getDay()
        for (let i = 0; i < dayOfWeek; i++) {
            currentWeek.push(null)
        }

        let lastMonth = -1

        while (currentDate <= endOfYear) {
            const key = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`

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

    const progressionFilteredSolves = useMemo(() => filterByTime(solvesWithAverages, progressionTimeRange), [solvesWithAverages, progressionTimeRange])
    const distributionFilteredSolves = useMemo(() => filterByTime(filteredSolves, distributionTimeRange), [filteredSolves, distributionTimeRange])

    const stats = useMemo(() => {
        // Use time-filtered solves to reflect the selected range
        const validSolves = progressionFilteredSolves.filter(s => s.penalty !== 'DNF')
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

        // Calculate Trend (Linear Regression)
        let trend = 0
        if (validSolves.length > 1) {
            let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0
            validSolves.forEach(s => {
                const x = s.timestamp
                const y = (s.timeMs + (s.penalty === 'plus2' ? 2000 : 0)) / 1000
                sumX += x
                sumY += y
                sumXY += x * y
                sumXX += x * x
            })
            const n = validSolves.length
            const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)

            // Trend is the predicted difference between end and start
            const startX = validSolves[0].timestamp
            const endX = validSolves[validSolves.length - 1].timestamp
            trend = slope * (endX - startX)
        }

        const currentAverages = calculateAverages(validSolves)
        const bestAo5 = getBestAverage(validSolves, 5)
        const bestAo12 = getBestAverage(validSolves, 12)
        const bestAo100 = getBestAverage(validSolves, 100)

        return {
            best, worst, mean, median, stdDev, count: validSolves.length, totalTime, improvement, trend,
            bestAo5, bestAo12, bestAo100,
            avgAo5: currentAverages.ao5,
            avgAo12: currentAverages.ao12,
            avgAo100: currentAverages.ao100
        }
    }, [progressionFilteredSolves])

    const currentTheme = useStore(state => state.currentTheme)
    const [themeColors, setThemeColors] = useState({
        bg: '#011502',
        textPrimary: '#9ec5ab',
        textSecondary: '#32746d',
        accent: '#9ec5ab',
        border: '#104f55'
    })

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

    const deleteSolve = useStore(state => state.deleteSolve)

    // Custom Tooltip State
    const [tooltipData, setTooltipData] = useState<{ x: number, y: number, solve: any } | null>(null)
    const tooltipTimeout = useRef<NodeJS.Timeout | null>(null)

    const handlePointHover = (e: Readonly<Plotly.PlotMouseEvent>) => {
        if (tooltipTimeout.current) clearTimeout(tooltipTimeout.current)

        const point = e.points.find(p => p.data.name === 'Single')
        if (point && point.pointIndex !== undefined) {
            // Get original event coordinates
            const { clientX, clientY } = (e.event as any)
            const solve = chartData[point.pointIndex].raw

            setTooltipData({
                x: clientX,
                y: clientY,
                solve
            })
        }
    }

    const handlePointUnhover = () => {
        tooltipTimeout.current = setTimeout(() => {
            setTooltipData(null)
        }, 300) // 300ms grace period to move to tooltip
    }

    const handleTooltipEnter = () => {
        if (tooltipTimeout.current) clearTimeout(tooltipTimeout.current)
    }

    const handleTooltipLeave = () => {
        tooltipTimeout.current = setTimeout(() => {
            setTooltipData(null)
        }, 300)
    }

    const handleDeleteSolve = async (id: string) => {
        if (window.confirm('Delete this solve?')) {
            await deleteSolve(id)
            setTooltipData(null)
        }
    }

    const chartData = useMemo(() => {
        // Solves are already sorted and have averages calculated in solvesWithAverages -> progressionFilteredSolves
        return progressionFilteredSolves.map((s, i) => {
            const item = s as any
            return {
                index: i + 1,
                timestamp: s.timestamp,
                time: s.penalty === 'DNF' ? null : (s.timeMs + (s.penalty === 'plus2' ? 2000 : 0)) / 1000,
                ao5: item.rollingAo5 && item.rollingAo5 > 0 ? item.rollingAo5 / 1000 : null,
                ao12: item.rollingAo12 && item.rollingAo12 > 0 ? item.rollingAo12 / 1000 : null,
                ao100: item.rollingAo100 && item.rollingAo100 > 0 ? item.rollingAo100 / 1000 : null,
                date: new Date(s.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
                raw: s
            }
        })
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

    // Construct Traces dynamically
    const traces: Plotly.Data[] = [
        // Main Scatter (Single Solves)
        {
            x: chartData.map(d => new Date(d.timestamp)),
            y: chartData.map(d => d.time),
            type: 'scatter',
            name: 'Single',
            mode: lineMode === 'connect' ? 'lines+markers' : 'markers',
            marker: { color: themeColors.accent, size: 6, opacity: 0.8 }, // Increased target size
            line: { color: themeColors.accent, width: 1, shape: 'linear' },
            connectgaps: false,
            hoverinfo: 'none', // Disable default hover for this trace
        }
    ]

    // Trend Line Trace (Linear Regression)
    if (lineMode === 'trend' && chartData.length > 1) {
        // Simple Least Squares Regression
        let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0

        // Filter out nulls for regression
        const validPoints = chartData.filter(d => d.time !== null)
        const count = validPoints.length

        if (count > 1) {
            validPoints.forEach(d => {
                const x = d.timestamp
                const y = d.time as number
                sumX += x
                sumY += y
                sumXY += x * y
                sumXX += x * x
            })

            const slope = (count * sumXY - sumX * sumY) / (count * sumXX - sumX * sumX)
            const intercept = (sumY - slope * sumX) / count

            const startX = validPoints[0].timestamp
            const endX = validPoints[validPoints.length - 1].timestamp
            const startY = slope * startX + intercept
            const endY = slope * endX + intercept

            traces.push({
                x: [new Date(startX), new Date(endX)],
                y: [startY, endY],
                type: 'scatter',
                mode: 'lines',
                name: 'Trend',
                line: { color: themeColors.accent, width: 2, dash: 'dot' },
                hoverinfo: 'skip'
            })
        }
    }

    // Ao5 Trace
    if (showAo5) {
        traces.push({
            x: chartData.map(d => new Date(d.timestamp)),
            y: chartData.map(d => d.ao5),
            type: 'scatter',
            mode: 'lines',
            name: 'Ao5',
            line: { color: themeColors.textPrimary, width: 2, shape: 'spline' },
            connectgaps: true,
            hovertemplate: 'Ao5: %{y:.2f}s<extra></extra>',
        })
    }

    // Ao12 Trace
    if (showAo12) {
        traces.push({
            x: chartData.map(d => new Date(d.timestamp)),
            y: chartData.map(d => d.ao12),
            type: 'scatter',
            mode: 'lines',
            name: 'Ao12',
            line: { color: themeColors.textSecondary, width: 2, shape: 'spline', dash: 'dash' }, // Dashed for distinction
            connectgaps: true,
            hovertemplate: 'Ao12: %{y:.2f}s<extra></extra>',
        })
    }

    // Ao100 Trace
    if (showAo100) {
        traces.push({
            x: chartData.map(d => new Date(d.timestamp)),
            y: chartData.map(d => d.ao100),
            type: 'scatter',
            mode: 'lines',
            name: 'Ao100',
            line: { color: themeColors.border, width: 2, shape: 'spline', dash: 'dot' }, // Dotted for long trend
            connectgaps: true,
            hovertemplate: 'Ao100: %{y:.2f}s<extra></extra>',
        })
    }

    return (
        <div className="analytics-container">
            {tooltipData && (
                <div
                    className="chart-tooltip"
                    style={{
                        position: 'fixed',
                        left: tooltipData.x + 15,
                        top: tooltipData.y - 40,
                        backgroundColor: themeColors.bg,
                        border: `1px solid ${themeColors.border}`,
                        padding: '12px',
                        borderRadius: '8px',
                        zIndex: 9999,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                        pointerEvents: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        minWidth: '160px',
                        maxWidth: '220px'
                    }}
                    onMouseEnter={handleTooltipEnter}
                    onMouseLeave={handleTooltipLeave}
                >
                    {/* Header: Time + Delete */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                            <span style={{ color: themeColors.accent, fontWeight: '700', fontSize: '1.2rem' }}>
                                {formatTime(tooltipData.solve.timeMs + (tooltipData.solve.penalty === 'plus2' ? 2000 : 0))}
                            </span>
                            {tooltipData.solve.penalty === 'plus2' && (
                                <span style={{ fontSize: '0.75rem', color: 'var(--error)' }}>(+2)</span>
                            )}
                        </div>
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteSolve(tooltipData.solve.id)
                            }}
                            style={{
                                background: 'rgba(255,255,255,0.1)',
                                border: 'none',
                                color: 'var(--text-secondary)',
                                cursor: 'pointer',
                                width: '24px',
                                height: '24px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: '4px',
                                fontSize: '14px',
                                transition: 'all 0.2s'
                            }}
                            className="tooltip-delete-btn"
                            title="Delete Solve"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Date */}
                    <div style={{ fontSize: '0.75rem', color: themeColors.textSecondary, marginBottom: '6px' }}>
                        {new Date(tooltipData.solve.timestamp).toLocaleDateString(undefined, {
                            weekday: 'short',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                        })}
                    </div>

                    {/* Stats Grid */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'auto 1fr',
                        gap: '4px 12px',
                        fontSize: '0.75rem'
                    }}>
                        {(tooltipData.solve as any).rollingAo5 ? (
                            <>
                                <span style={{ color: themeColors.textSecondary }}>ao5</span>
                                <span style={{ color: themeColors.textPrimary, textAlign: 'right' }}>
                                    {formatTime((tooltipData.solve as any).rollingAo5)}
                                </span>
                            </>
                        ) : null}

                        {(tooltipData.solve as any).rollingAo12 ? (
                            <>
                                <span style={{ color: themeColors.textSecondary }}>ao12</span>
                                <span style={{ color: themeColors.textPrimary, textAlign: 'right' }}>
                                    {formatTime((tooltipData.solve as any).rollingAo12)}
                                </span>
                            </>
                        ) : null}

                        {(tooltipData.solve as any).rollingAo100 ? (
                            <>
                                <span style={{ color: themeColors.textSecondary }}>ao100</span>
                                <span style={{ color: themeColors.textPrimary, textAlign: 'right' }}>
                                    {formatTime((tooltipData.solve as any).rollingAo100)}
                                </span>
                            </>
                        ) : null}
                    </div>
                </div>
            )}

            <div className="analytics-header">
                {/* ... (Keep original header content) */}
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

            {/* ... (Stats Grid stays same) */}
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
                {/* Activity Heatmap (Keep same) */}
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
                        {/* ... (Heatmap rendering same as before) */}
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
                    <div className="chart-header" style={{ flexWrap: 'wrap', gap: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem', marginRight: 'auto' }}>
                            <h3>progression</h3>
                            {lineMode === 'trend' && stats && stats.trend !== undefined && (
                                <span style={{
                                    fontSize: '0.9rem',
                                    color: stats.trend < 0 ? 'var(--text-primary)' : 'var(--error)',
                                    fontWeight: 500,
                                    fontFamily: 'JetBrains Mono'
                                }}>
                                    trend: {stats.trend > 0 ? '+' : ''}{stats.trend.toFixed(3)}s
                                </span>
                            )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
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

                            <div style={{ width: '1px', height: '24px', background: 'var(--border)', opacity: 0.5 }}></div>

                            <div className="chart-toggles" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <div style={{ display: 'flex', gap: '0.25rem' }}>
                                    <button
                                        onClick={() => setShowAo5(!showAo5)}
                                        style={{
                                            padding: '4px 8px',
                                            borderRadius: '4px',
                                            border: `1px solid ${showAo5 ? themeColors.textPrimary : 'var(--border)'}`,
                                            background: showAo5 ? 'rgba(255,255,255,0.05)' : 'transparent',
                                            color: showAo5 ? themeColors.textPrimary : 'var(--text-secondary)',
                                            fontSize: '0.75rem',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        Ao5
                                    </button>
                                    <button
                                        onClick={() => setShowAo12(!showAo12)}
                                        style={{
                                            padding: '4px 8px',
                                            borderRadius: '4px',
                                            border: `1px solid ${showAo12 ? themeColors.textSecondary : 'var(--border)'}`,
                                            background: showAo12 ? 'rgba(255,255,255,0.05)' : 'transparent',
                                            color: showAo12 ? themeColors.textSecondary : 'var(--text-secondary)',
                                            fontSize: '0.75rem',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        Ao12
                                    </button>
                                    <button
                                        onClick={() => setShowAo100(!showAo100)}
                                        style={{
                                            padding: '4px 8px',
                                            borderRadius: '4px',
                                            border: `1px solid ${showAo100 ? themeColors.border : 'var(--border)'}`,
                                            background: showAo100 ? 'rgba(255,255,255,0.05)' : 'transparent',
                                            color: showAo100 ? themeColors.border : 'var(--text-secondary)',
                                            fontSize: '0.75rem',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        Ao100
                                    </button>
                                </div>

                                <div style={{ width: '1px', height: '16px', background: 'var(--border)', margin: '0 2px' }}></div>

                                <button
                                    onClick={() => {
                                        if (lineMode === 'none') setLineMode('trend')
                                        else if (lineMode === 'trend') setLineMode('connect')
                                        else setLineMode('none')
                                    }}
                                    style={{
                                        padding: '4px 10px',
                                        borderRadius: '4px',
                                        border: `1px solid ${lineMode !== 'none' ? themeColors.accent : 'var(--border)'}`,
                                        background: lineMode !== 'none' ? 'rgba(255,255,255,0.05)' : 'transparent',
                                        color: lineMode !== 'none' ? themeColors.textPrimary : 'var(--text-secondary)',
                                        fontSize: '0.75rem',
                                        cursor: 'pointer',
                                        minWidth: '60px',
                                        textAlign: 'center',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {lineMode === 'none' ? 'points' : lineMode}
                                </button>

                                <div style={{ width: '1px', height: '16px', background: 'var(--border)', margin: '0 2px' }}></div>

                                <button
                                    onClick={() => setResetCount(c => c + 1)}
                                    style={{
                                        padding: '4px 8px',
                                        borderRadius: '4px',
                                        border: '1px solid var(--border)',
                                        background: 'transparent',
                                        color: 'var(--text-secondary)',
                                        fontSize: '1rem',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        height: '26px',
                                        width: '26px',
                                        transition: 'all 0.2s'
                                    }}
                                    title="Reset Zoom"
                                >
                                    ↺
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="chart-wrapper">
                        {chartData.length > 0 ? (
                            <Plot
                                data={traces} // Updated to use dynamic traces
                                layout={{
                                    autosize: true,
                                    uirevision: `${progressionTimeRange}-${resetCount}`, // Preserve state unless range changes or reset clicked
                                    margin: { l: 40, r: 20, t: 20, b: 40 },
                                    paper_bgcolor: 'rgba(0,0,0,0)',
                                    plot_bgcolor: 'rgba(0,0,0,0)',
                                    font: {
                                        family: 'Inter, sans-serif',
                                        color: themeColors.textSecondary
                                    },
                                    hoverlabel: {
                                        bgcolor: themeColors.bg,
                                        bordercolor: themeColors.border,
                                        font: { color: themeColors.textPrimary },
                                        align: 'left'
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
                                    hovermode: 'closest', // Changed from 'x unified' to allow specific point hovering
                                    showlegend: false
                                }}
                                config={{
                                    displayModeBar: false,
                                    responsive: true
                                }}
                                style={{ width: '100%', height: '100%' }}
                                onHover={handlePointHover}
                                onUnhover={handlePointUnhover}
                            />
                        ) : (
                            <div className="empty-state">no data for this period</div>
                        )}
                    </div>
                </div>

                {/* Time Distribution Chart (Same as before) */}
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
        </div>
    )
}
