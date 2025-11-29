import { useState } from 'react'
import { useAuth } from '../authStore'

export default function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const signUp = useAuth(s => s.signUpWithEmailPassword)
  const signInWithGoogle = useAuth(s => s.signInWithGoogle)
  const error = useAuth(s => s.error)

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <h3 style={{ margin: 0 }}>Sign up</h3>
      <input placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} />
      <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
      <input placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
      <button onClick={() => { void signUp(email, password, username) }}>Create account</button>
      <button onClick={() => { void signInWithGoogle() }}>Continue with Google</button>
      {error && <div style={{ color: 'crimson', fontSize: 12 }}>{error}</div>}
    </div>
  )
}


