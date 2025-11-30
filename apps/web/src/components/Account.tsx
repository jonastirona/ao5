import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../authStore'
import { useStore } from '../store'

type Toast = { id: string; message: string; tone: 'success' | 'error' | 'info' }

import ConfirmationModal from './ConfirmationModal'

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

  const [mode, setMode] = useState<'profile' | 'login' | 'signup' | 'forgot-password'>(user ? 'profile' : 'login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const isGoogleUser = user?.app_metadata?.provider === 'google' || user?.app_metadata?.providers?.includes('google')
  const [busy, setBusy] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean
    title: string
    message: string
    confirmLabel: string
    onConfirm: () => void
    isDangerous?: boolean
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmLabel: '',
    onConfirm: () => { },
    isDangerous: false
  })

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
      addToast('account created!', 'success')
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

  async function handleResetPassword(ev: React.FormEvent) {
    ev.preventDefault()
    if (!email) return
    setBusy(true)
    try {
      await useAuth.getState().resetPassword(email)
      addToast('reset link sent to email', 'success')
      setMode('login')
    } catch {
      addToast('failed to send reset link', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="account-container">

      <div className="account-card">
        {initializing && (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>authenticating...</p>
          </div>
        )}

        {!initializing && user ? (
          <div className="profile-view">
            <div className="profile-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div className="avatar-placeholder">
                  {user.email?.charAt(0).toUpperCase()}
                </div>
                <div className="profile-info">
                  <h2>{useAuth.getState().username || user.email}</h2>
                  <p>member since {new Date(user.created_at || Date.now()).toLocaleString('default', { month: 'long', year: 'numeric' }).toLowerCase()}</p>
                </div>
              </div>
              <Link to="/" className="close-btn">×</Link>
            </div>

            {globalStats && (
              <div className="profile-stats">
                <div className="stat-item">
                  <label>total solves</label>
                  <div className="value">{globalStats.count}</div>
                </div>
                <div className="stat-item">
                  <label>time cubing</label>
                  <div className="value">{(globalStats.timeSpent / 1000 / 60 / 60).toFixed(1)}h</div>
                </div>
              </div>
            )}

            <div className="profile-actions">
              <button className="btn ghost" onClick={handleSignOut}>sign out</button>
            </div>

            <div className="settings-group" style={{ marginTop: '2rem' }}>
              <h3>profile</h3>
              <div className="form-group">
                <label>change username</label>
                <div className="input-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <input
                    className="input"
                    placeholder="new username"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                  />
                  <button
                    className="btn secondary full-width"
                    disabled={!username || username.length < 2 || busy}
                    onClick={async () => {
                      setBusy(true)
                      try {
                        await useAuth.getState().updateUsername(username)
                        addToast('username updated!', 'success')
                        setUsername('')
                      } catch (err: unknown) {
                        console.error(err)
                        const message = (err as Error).message || 'failed to update username'
                        if (message.includes('duplicate key') || message.includes('unique constraint')) {
                          addToast('username already taken', 'error')
                        } else {
                          addToast(message, 'error')
                        }
                      } finally {
                        setBusy(false)
                      }
                    }}
                  >
                    update
                  </button>
                </div>
              </div>
            </div>

            {!isGoogleUser && (
              <div className="settings-group" style={{ marginTop: '2rem' }}>
                <h3>security</h3>
                <div className="form-group">
                  <label>update email</label>
                  <div className="input-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <input
                      className="input"
                      placeholder="new email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                    />
                    <button
                      className="btn secondary full-width"
                      disabled={!email || busy}
                      onClick={async () => {
                        setBusy(true)
                        try {
                          await useAuth.getState().updateEmail(email)
                          addToast('confirmation email sent!', 'success')
                          setEmail('')
                        } catch (err: unknown) {
                          console.error(err)
                          const message = (err as Error).message || 'failed to update email'
                          if (message.includes('already been registered') || message.includes('already registered')) {
                            addToast('email already in use', 'error')
                          } else {
                            addToast('failed to update email', 'error')
                          }
                        } finally {
                          setBusy(false)
                        }
                      }}
                    >
                      update
                    </button>
                  </div>
                </div>
                <div className="form-group">
                  <label>change password</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <input
                      className="input"
                      type="password"
                      placeholder="current password"
                      value={currentPassword}
                      onChange={e => setCurrentPassword(e.target.value)}
                    />
                    <input
                      className="input"
                      type="password"
                      placeholder="new password"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                    />
                    <input
                      className="input"
                      type="password"
                      placeholder="confirm new password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                    />
                    <button
                      className="btn secondary full-width"
                      disabled={!currentPassword || !newPassword || !confirmPassword || newPassword.length < 6 || busy}
                      onClick={async () => {
                        if (newPassword !== confirmPassword) {
                          addToast('passwords do not match', 'error')
                          return
                        }
                        setBusy(true)
                        try {
                          // Verify current password by signing in
                          if (user?.email) {
                            await signIn(user.email, currentPassword)
                          }
                          await useAuth.getState().updatePassword(newPassword)
                          addToast('password updated!', 'success')
                          setCurrentPassword('')
                          setNewPassword('')
                          setConfirmPassword('')
                        } catch (err) {
                          console.error(err)
                          addToast('failed to update password (check current password)', 'error')
                        } finally {
                          setBusy(false)
                        }
                      }}
                    >
                      update
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="settings-group danger-zone" style={{ marginTop: '2rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
              <h3 style={{ color: 'var(--error)' }}></h3>
              <div className="danger-actions" style={{ display: 'flex', gap: '1rem', flexDirection: 'column' }}>
                <div className="danger-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong>DELETE ALL DATA</strong>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>permanently delete all your solves.</p>
                  </div>
                  <button
                    className="btn danger small"
                    onClick={() => {
                      setConfirmModal({
                        isOpen: true,
                        title: 'delete all data?',
                        message: 'are you sure you want to delete ALL your solves? this cannot be undone.',
                        confirmLabel: 'delete data',
                        isDangerous: true,
                        onConfirm: async () => {
                          setConfirmModal(prev => ({ ...prev, isOpen: false }))
                          setBusy(true)
                          try {
                            await useAuth.getState().clearUserData()
                            addToast('all data deleted', 'success')
                          } catch {
                            addToast('failed to delete data', 'error')
                          } finally {
                            setBusy(false)
                          }
                        }
                      })
                    }}
                  >
                    delete data
                  </button>
                </div>
                <div className="danger-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong>DELETE ACCOUNT</strong>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>permanently delete your account and all data.</p>
                  </div>
                  <button
                    className="btn danger small"
                    onClick={() => {
                      setConfirmModal({
                        isOpen: true,
                        title: 'delete account?',
                        message: 'are you sure you want to delete your account? this cannot be undone.',
                        confirmLabel: 'delete account',
                        isDangerous: true,
                        onConfirm: async () => {
                          setConfirmModal(prev => ({ ...prev, isOpen: false }))
                          setBusy(true)
                          try {
                            await useAuth.getState().deleteAccount()
                            addToast('account deleted', 'success')
                            navigate('/')
                          } catch {
                            addToast('failed to delete account', 'error')
                          } finally {
                            setBusy(false)
                          }
                        }
                      })
                    }}
                  >
                    delete account
                  </button>
                </div>
              </div>
            </div>

            {shouldPromptSync && pendingLocalOnlyCount > 0 && (
              <div className="sync-prompt">
                <p>we found {pendingLocalOnlyCount} solves on this device that aren't in your account.</p>
                <div className="sync-actions">
                  <button className="btn primary small" onClick={async () => {
                    setBusy(true)
                    try {
                      await syncLocal()
                      addToast('synced local solves to cloud', 'success')
                    } catch {
                      addToast('failed to sync local solves', 'error')
                    } finally {
                      setBusy(false)
                    }
                  }}>sync now</button>
                  <button className="btn text small" onClick={() => dismissSync()}>dismiss</button>
                </div>
              </div>
            )}
          </div>
        ) : (
          !initializing && (
            mode === 'login' ? (
              <form className="auth-form" onSubmit={handleLogin}>
                <h2>welcome back</h2>
                <div className="form-group">
                  <input className="input" placeholder="email" value={email} onChange={e => setEmail(e.target.value)} />
                </div>
                <div className="form-group">
                  <input className="input" placeholder="password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
                </div>
                <div className="auth-actions">
                  <button className="btn primary full-width" type="submit" disabled={!canSubmitLogin || busy}>log in</button>
                  <button className="btn ghost full-width" type="button" onClick={handleGoogle} disabled={busy}>log in with google</button>
                  <button className="btn text full-width" type="button" onClick={() => setMode('forgot-password')} disabled={busy} style={{ fontSize: '12px', marginTop: '0.5rem' }}>forgot password?</button>
                </div>
                <div className="auth-footer">
                  <p>don't have an account? <button type="button" onClick={() => setMode('signup')}>sign up</button></p>
                </div>
              </form>
            ) : mode === 'forgot-password' ? (
              <form className="auth-form" onSubmit={handleResetPassword}>
                <h2>reset password</h2>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                  enter your email to receive a password reset link. if you signed in with google, please sign in with google directly.
                </p>
                <div className="form-group">
                  <input className="input" placeholder="email" value={email} onChange={e => setEmail(e.target.value)} />
                </div>
                <div className="auth-actions">
                  <button className="btn primary full-width" type="submit" disabled={!email || busy}>send reset link</button>
                  <button className="btn ghost full-width" type="button" onClick={() => setMode('login')} disabled={busy}>back to login</button>
                </div>
              </form>
            ) : (
              <form className="auth-form" onSubmit={handleSignup}>
                <h2>create account</h2>
                <div className="form-group">
                  <input className="input" placeholder="username" value={username} onChange={e => setUsername(e.target.value)} />
                </div>
                <div className="form-group">
                  <input className="input" placeholder="email" value={email} onChange={e => setEmail(e.target.value)} />
                </div>
                <div className="form-group">
                  <input className="input" placeholder="password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
                </div>
                <div className="auth-actions">
                  <button className="btn primary full-width" type="submit" disabled={!canSubmitSignup || busy}>sign up</button>
                  <button className="btn ghost full-width" type="button" onClick={handleGoogle} disabled={busy}>sign up with google</button>
                </div>
                <div className="auth-footer">
                  <p>already have an account? <button type="button" onClick={() => setMode('login')}>log in</button></p>
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

      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmLabel={confirmModal.confirmLabel}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        isDangerous={confirmModal.isDangerous}
      />
    </div>
  )
}
