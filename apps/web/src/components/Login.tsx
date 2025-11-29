import { useState } from 'react'
import { useAuth } from '../authStore'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const signIn = useAuth(s => s.signInWithEmailPassword)
  const signInWithGoogle = useAuth(s => s.signInWithGoogle)
  const error = useAuth(s => s.error)

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <h3 style={{ margin: 0 }}>Login</h3>
      <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
      <input placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
      <button onClick={() => { void signIn(email, password) }}>Login</button>
      <button onClick={() => { void signInWithGoogle() }}>Continue with Google</button>
      {error && <div style={{ color: 'crimson', fontSize: 12 }}>{error}</div>}
    </div>
  )
}


