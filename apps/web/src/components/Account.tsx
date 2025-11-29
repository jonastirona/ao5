import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../authStore'
import { useStore } from '../store'

type Toast = { id: string; message: string; tone: 'success' | 'error' | 'info' }

export default function Account() {
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAuth(s => s.user)
  const initializing = useAuth(s => s.initializing)
  const error = useAuth(s => s.error)
  const signIn = useAuth(s => s.signInWithEmailPassword)
  const signUp = useAuth(s => s.signUpWithEmailPassword)
  const signInWithGoogle = useAuth(s => s.signInWithGoogle)
  const signOut = useAuth(s => s.signOut)
  const shouldPromptSync = useAuth(s => s.shouldPromptSync)
  const pendingLocalOnlyCount = useAuth(s => s.pendingLocalOnlyCount)
  const syncLocal = useAuth(s => s.syncLocalSolvesToCloud)
  const dismissSync = useAuth(s => s.dismissSyncPrompt)

  const getAllSolves = useStore(s => s.getAllSolves)

  const [mode, setMode] = useState<'profile' | 'login' | 'signup'>(user ? 'profile' : 'login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [busy, setBusy] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => { if (error) addToast(error, 'error') }, [error])
  // Keep mode synced with auth state
  useEffect(() => { setMode(user ? 'profile' : 'login') }, [user])

  // After OAuth redirect back, if we land on /account and are authenticated, ensure profile shows
  useEffect(() => {
    if (location.pathname === '/account' && user) setMode('profile')
  }, [location.pathname, user])

  // Timeout fallback for loading state - if initializing takes too long, show login
  useEffect(() => {
    if (initializing) {
      const timeout = setTimeout(() => {
        console.warn('[Account] Auth initialization timeout, forcing login mode')
        setMode('login')
        // Force the auth store to stop initializing
        useAuth.setState({ initializing: false })
      }, 3000) // 3 second timeout
      return () => clearTimeout(timeout)
    }
  }, [initializing])

  const canSubmitLogin = useMemo(() => email.length > 3 && password.length >= 6, [email, password])
  const canSubmitSignup = useMemo(() => username.length >= 2 && email.length > 3 && password.length >= 6, [username, email, password])

  const globalStats = useMemo(() => {
    if (!user) return null
    const solves = getAllSolves()
    const count = solves.length
    const timeSpent = solves.reduce((acc, s) => acc + s.timeMs, 0)
    return { count, timeSpent }
  }, [user, getAllSolves])

  function addToast(message: string, tone: Toast['tone'] = 'info') {
    const id = crypto.randomUUID()
    setToasts(t => [...t, { id, message, tone }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3000)
  }

  async function handleLogin(ev: React.FormEvent) {
    ev.preventDefault()
    if (!canSubmitLogin) return
    setBusy(true)
    try {
      await signIn(email, password)
      addToast('Successfully signed in!', 'success')
      setEmail('')
      setPassword('')
      navigate('/')
    } catch {
      addToast('Failed to sign in', 'error')
    } finally {
      setBusy(false)
    }
  }

  async function handleSignup(ev: React.FormEvent) {
    ev.preventDefault()
    if (!canSubmitSignup) return
    setBusy(true)
    try {
      await signUp(email, password, username)
      addToast('Account created! Please check your email and click the verification link to complete signup.', 'success')
      setMode('login')
      setEmail('')
      setPassword('')
      setUsername('')
    } catch {
      addToast('Failed to sign up', 'error')
    } finally {
      setBusy(false)
    }
  }

  async function handleGoogle() {
    setBusy(true)
    try {
      await signInWithGoogle()
      addToast('Redirecting to Google…', 'info')
    } catch {
      addToast('Google sign in failed', 'error')
    } finally {
      setBusy(false)
    }
  }

  async function handleSignOut() {
    setBusy(true)
    try {
      await signOut()
      addToast('Signed out', 'success')
      setEmail('')
      setPassword('')
      setUsername('')
    } catch (error) {
      console.error('Sign out error:', error)
      addToast('Failed to sign out', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="account-container">
      <Link to="/" className="close-btn" style={{ position: 'absolute', top: '2rem', right: '2rem' }}>×</Link>
      <div className="account-card">
        {initializing && (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading authentication...</p>
          </div>
        )}

        {!initializing && user ? (
          <div className="profile-view">
            <div className="profile-header">
              <div className="avatar-placeholder">
                {user.email?.charAt(0).toUpperCase()}
              </div>
              <div className="profile-info">
                <h2>{user.email}</h2>
                <p>Member since {new Date(user.created_at || Date.now()).getFullYear()}</p>
              </div>
            </div>

            {globalStats && (
              <div className="profile-stats">
                <div className="stat-item">
                  <label>Total Solves</label>
                  <div className="value">{globalStats.count}</div>
                </div>
                <div className="stat-item">
                  <label>Time Cubing</label>
                  <div className="value">{(globalStats.timeSpent / 1000 / 60 / 60).toFixed(1)}h</div>
                </div>
              </div>
            )}

            <div className="profile-actions">
              <button className="btn ghost" onClick={handleSignOut}>Sign Out</button>
            </div>

            <div className="settings-group" style={{ marginTop: '2rem' }}>
              <h3>Security</h3>
              <div className="form-group">
                <label>Update Email</label>
                <div className="input-group" style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    className="input"
                    placeholder="New Email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                  <button
                    className="btn secondary"
                    disabled={!email || busy}
                    onClick={async () => {
                      setBusy(true)
                      try {
                        await useAuth.getState().updateEmail(email)
                        addToast('Confirmation email sent!', 'success')
                        setEmail('')
                      } catch {
                        addToast('Failed to update email', 'error')
                      } finally {
                        setBusy(false)
                      }
                    }}
                  >
                    Update
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label>Update Password</label>
                <div className="input-group" style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    className="input"
                    type="password"
                    placeholder="New Password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                  />
                  <button
                    className="btn secondary"
                    disabled={!password || password.length < 6 || busy}
                    onClick={async () => {
                      setBusy(true)
                      try {
                        await useAuth.getState().updatePassword(password)
                        addToast('Password updated!', 'success')
                        setPassword('')
                      } catch {
                        addToast('Failed to update password', 'error')
                      } finally {
                        setBusy(false)
                      }
                    }}
                  >
                    Update
                  </button>
                </div>
              </div>
            </div>

            <div className="settings-group danger-zone" style={{ marginTop: '2rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
              <h3 style={{ color: 'var(--error)' }}></h3>
              <div className="danger-actions" style={{ display: 'flex', gap: '1rem', flexDirection: 'column' }}>
                <div className="danger-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong>Delete All Data</strong>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>Permanently delete all your solves.</p>
                  </div>
                  <button
                    className="btn danger small"
                    onClick={async () => {
                      if (!confirm('Are you sure you want to delete ALL your solves? This cannot be undone.')) return
                      setBusy(true)
                      try {
                        await useAuth.getState().clearUserData()
                        addToast('All data deleted', 'success')
                      } catch {
                        addToast('Failed to delete data', 'error')
                      } finally {
                        setBusy(false)
                      }
                    }}
                  >
                    Delete Data
                  </button>
                </div>
                <div className="danger-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong>Delete Account</strong>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>Permanently delete your account and all data.</p>
                  </div>
                  <button
                    className="btn danger small"
                    onClick={async () => {
                      if (!confirm('Are you sure you want to delete your account? This cannot be undone.')) return
                      setBusy(true)
                      try {
                        await useAuth.getState().deleteAccount()
                        addToast('Account deleted', 'success')
                        navigate('/')
                      } catch {
                        addToast('Failed to delete account', 'error')
                      } finally {
                        setBusy(false)
                      }
                    }}
                  >
                    Delete Account
                  </button>
                </div>
              </div>
            </div>

            {shouldPromptSync && pendingLocalOnlyCount > 0 && (
              <div className="sync-prompt">
                <p>We found {pendingLocalOnlyCount} solves on this device that aren't in your account.</p>
                <div className="sync-actions">
                  <button className="btn primary small" onClick={async () => {
                    setBusy(true)
                    try {
                      await syncLocal()
                      addToast('Synced local solves to cloud', 'success')
                    } catch {
                      addToast('Failed to sync local solves', 'error')
                    } finally {
                      setBusy(false)
                    }
                  }}>Sync Now</button>
                  <button className="btn text small" onClick={() => dismissSync()}>Dismiss</button>
                </div>
              </div>
            )}
          </div>
        ) : (
          !initializing && (
            mode === 'login' ? (
              <form className="auth-form" onSubmit={handleLogin}>
                <h2>Welcome Back</h2>
                <div className="form-group">
                  <input className="input" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
                </div>
                <div className="form-group">
                  <input className="input" placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
                </div>
                <div className="auth-actions">
                  <button className="btn primary full-width" type="submit" disabled={!canSubmitLogin || busy}>Log In</button>
                  <button className="btn ghost full-width" type="button" onClick={handleGoogle} disabled={busy}>Log In with Google</button>
                </div>
                <div className="auth-footer">
                  <p>Don't have an account? <button type="button" onClick={() => setMode('signup')}>Sign Up</button></p>
                </div>
              </form>
            ) : (
              <form className="auth-form" onSubmit={handleSignup}>
                <h2>Create Account</h2>
                <div className="form-group">
                  <input className="input" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} />
                </div>
                <div className="form-group">
                  <input className="input" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
                </div>
                <div className="form-group">
                  <input className="input" placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
                </div>
                <div className="auth-actions">
                  <button className="btn primary full-width" type="submit" disabled={!canSubmitSignup || busy}>Sign Up</button>
                  <button className="btn ghost full-width" type="button" onClick={handleGoogle} disabled={busy}>Sign Up with Google</button>
                </div>
                <div className="auth-footer">
                  <p>Already have an account? <button type="button" onClick={() => setMode('login')}>Log In</button></p>
                </div>
              </form>
            )
          )
        )}
      </div>

      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.tone}`}>{t.message}</div>
        ))}
      </div>
    </div>
  )
}
