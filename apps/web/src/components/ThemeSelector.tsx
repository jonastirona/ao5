import { useStore } from '../store'
import { themes } from '../themes'

/**
 * Component for selecting the application theme.
 * Displays a grid of available themes with previews.
 */
export default function ThemeSelector() {
    const currentTheme = useStore(s => s.currentTheme)
    const setTheme = useStore(s => s.setTheme)

    return (
        <div className="theme-selector">
            <h3>Theme</h3>
            <div className="theme-grid">
                {Object.entries(themes).map(([key, theme]) => (
                    <button
                        key={key}
                        className={`theme-btn ${currentTheme === key ? 'active' : ''}`}
                        onClick={() => setTheme(key)}
                        style={{
                            backgroundColor: theme.colors.bg,
                            color: theme.colors.textPrimary,
                            borderColor: theme.colors.border
                        }}
                    >
                        <div className="theme-preview">
                            <div className="color-dot" style={{ background: theme.colors.textPrimary }} />
                            <div className="color-dot" style={{ background: theme.colors.accent }} />
                        </div>
                        <span>{theme.name}</span>
                    </button>
                ))}
            </div>
        </div>
    )
}
