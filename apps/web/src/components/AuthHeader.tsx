import { useEffect } from 'react'
import { useAuth } from '../authStore'

export default function AuthHeader() {
  const user = useAuth(s => s.user)
  const initializing = useAuth(s => s.initializing)
  const init = useAuth(s => s.init)
  const signOut = useAuth(s => s.signOut)

  useEffect(() => {
    if (!initializing) return
    init()
  }, [initializing, init])

  if (initializing) return null

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {user ? (
        <>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{user.email}</span>
          <button className="header-link" onClick={() => { void signOut() }}>Logout</button>
        </>
      ) : null}
    </div>
  )
}


