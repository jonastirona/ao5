import './App.css'
import { Suspense, lazy, useEffect, useState } from 'react'
import { useAuth } from './authStore'
const ScrambleDisplay = lazy(() => import('./components/ScrambleDisplay'))
import TimerDisplay from './components/TimerDisplay'
import SessionList from './components/SessionList'
import SessionManager from './components/SessionManager'
import Analytics from './components/Analytics'
import Account from './components/Account'
import Settings from './components/Settings'
import { themes } from './themes'
import { BrowserRouter, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom'
import { useStore } from './store'

import About from './components/About'
import Support from './components/Support'
import PrivacyPolicy from './components/PrivacyPolicy'
import TermsOfService from './components/TermsOfService'
import TourOverlay from './components/TourOverlay'
import PBAnimation from './components/PBAnimation'

import GlobalShortcuts from './components/GlobalShortcuts'
import NetworkStatus from './components/NetworkStatus'
import GuestBanner from './components/GuestBanner'
import LoginPromptModal from './components/LoginPromptModal'
import MergeSessionModal from './components/MergeSessionModal'
import HelpTooltip from './components/HelpTooltip'
import SEO from './components/SEO'

function AppContent() {
  // Initialize auth/session on app start
  useEffect(() => {
    useAuth.getState().init()
    useStore.getState().initPresence()
  }, [])
  const isKeyHeld = useStore(s => s.isKeyHeld)
  const isTimerRunning = useStore(s => s.isTimerRunning)
  const timerState = useStore(s => s.timerState)
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false)
  const [pendingOnboarding, setPendingOnboarding] = useState(false)
  const [showHelpTooltip, setShowHelpTooltip] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  const authInitializing = useAuth(s => s.initializing)
  const user = useAuth(s => s.user)

  useEffect(() => {
    if (authInitializing) return

    const hasSeenOnboarding = localStorage.getItem('ao5.hasSeenOnboarding')
    if (!hasSeenOnboarding) {
      if (!user) {
        // Instead of auto-starting, show the tooltip
        setShowHelpTooltip(true)
      }
      localStorage.setItem('ao5.hasSeenOnboarding', 'true')
    }
  }, [authInitializing, user])

  useEffect(() => {
    if (pendingOnboarding && location.pathname === '/') {
      // Wait a tick for the route to render
      const timer = setTimeout(() => {
        setIsOnboardingOpen(true)
        setPendingOnboarding(false)
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [location.pathname, pendingOnboarding])

  useEffect(() => {
    const handleOpenAuth = () => {
      navigate('/account')
    }
    window.addEventListener('open-auth-modal', handleOpenAuth)
    return () => window.removeEventListener('open-auth-modal', handleOpenAuth)
  }, [navigate])

  const handleStartTour = () => {
    setShowHelpTooltip(false) // Close tooltip if they click help
    if (location.pathname !== '/') {
      setPendingOnboarding(true)
      navigate('/')
    } else {
      setIsOnboardingOpen(true)
    }
  }

  // Hide components when key is held OR timer is running OR during inspection
  const shouldHide = isKeyHeld || isTimerRunning || timerState === 'inspection'

  const currentTheme = useStore(s => s.currentTheme)

  useEffect(() => {
    const theme = themes[currentTheme] || themes.default
    const root = document.documentElement
    Object.entries(theme.colors).forEach(([key, value]) => {
      // Convert camelCase to kebab-case for CSS variables
      const cssVar = `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`
      root.style.setProperty(cssVar, value)
    })
  }, [currentTheme])



  return (
    <>
      <GlobalShortcuts openOnboarding={handleStartTour} />
      <PBAnimation />
      <NetworkStatus />
      <GuestBanner />
      <LoginPromptModal />
      <MergeSessionModal />
      <div className="layout">

        <header className="header">
          <div className="header-left">
            <Link to="/" className="logo-link">
              <div className="logo">ao5</div>
            </Link>
            <div className={`header-control ${shouldHide ? 'hidden' : ''}`}>
              <SessionManager />
            </div>
            <div style={{ position: 'relative', marginRight: '0.5rem' }} className={shouldHide ? 'hidden' : ''}>
              <button
                className="header-link"
                onClick={handleStartTour}
                aria-label="Help"
                data-tour="help-button"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0 }}
              >
                <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11 18h2v-2h-2v2zm1-16C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-2.21 0-4 1.79-4 4h2c0-1.1.9-2 2-2s2 .9 2 2c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5 0-2.21-1.79-4-4-4z" />
                </svg>
              </button>
              {showHelpTooltip && <HelpTooltip onClose={() => setShowHelpTooltip(false)} />}
            </div>
            <Link className={`header-link ${shouldHide ? 'hidden' : ''}`} to="/stats" aria-label="Stats" data-tour="stats-link">
              <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 3v18h18M9 9l3 3 3-3M9 15l3 3 3-3" />
              </svg>
            </Link>
          </div>
          <div className={`header-right ${shouldHide ? 'hidden' : ''}`}>
            <Link className="header-link" to="/support" aria-label="Support" data-tour="support-link">
              <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            </Link>
            <Link className="header-link" to="/about" aria-label="About" data-tour="about-link">
              <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
              </svg>
            </Link>
            <Link className="header-link" to="/settings" aria-label="Settings" data-tour="settings-link">
              <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12,0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z" />
              </svg>
            </Link>
            <Link className="header-link" to="/account" aria-label="Account" data-tour="account-link">
              <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" />
              </svg>
            </Link>

          </div>
        </header>

        <TourOverlay
          isOpen={isOnboardingOpen}
          onClose={() => setIsOnboardingOpen(false)}
        />

        <Routes>
          <Route
            path="/"
            element={(
              <>
                <SEO />
                <div className={`scramble-layer ${shouldHide ? 'hidden' : ''}`} data-tour="scramble">
                  <Suspense fallback={<div style={{ height: 150 }}></div>}>
                    <ScrambleDisplay />
                  </Suspense>
                </div>
                <main className="main" data-tour="timer">
                  <TimerDisplay />
                </main>
                <footer className={`footer ${shouldHide ? 'hidden' : ''}`} data-tour="solve-list" style={{ flexDirection: 'column', gap: '0.5rem' }}>
                  <SessionList />

                </footer>
              </>
            )}
          />
          <Route path="/stats" element={<><SEO title="Statistics | ao5" path="/stats" description="Analyze your solve times, view graphs, and track your progress." /><Analytics /></>} />
          <Route path="/settings" element={<><SEO title="Settings | ao5" path="/settings" /><Settings /></>} />
          <Route path="/about" element={<><SEO title="About | ao5" path="/about" description="Everything you need to know about ao5." /><About /></>} />
          <Route path="/support" element={<><SEO title="Support | ao5" path="/support" description="Get help, report bugs, or request features for ao5." /><Support /></>} />
          <Route path="/privacy" element={<><SEO title="Privacy Policy | ao5" path="/privacy" description="Our commitment to your privacy." /><PrivacyPolicy /></>} />
          <Route path="/terms" element={<><SEO title="Terms of Service | ao5" path="/terms" /><TermsOfService /></>} />
          <Route path="/account" element={<><SEO title="Your Account | ao5" path="/account" /><Account /></>} />
        </Routes>
      </div>
    </>
  )
}

/**
 * Root component of the application.
 * Sets up routing, global state initialization, and the main layout.
 */
export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  )
}
