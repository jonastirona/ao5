import { useState } from 'react'
import { useAuth } from '../authStore'

/**
 * Signup form component.
 * Allows users to create an account with email/password or Google OAuth.
 */
export default function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const signUp = useAuth(s => s.signUpWithEmailPassword)
  const signInWithGoogle = useAuth(s => s.signInWithGoogle)
  const error = useAuth(s => s.error)

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <h3 style={{ margin: 0 }}>sign up</h3>
      <input placeholder="username" value={username} onChange={e => setUsername(e.target.value)} />
      <input placeholder="email" value={email} onChange={e => setEmail(e.target.value)} />
      <input placeholder="password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
      <button onClick={() => { void signUp(email, password, username) }}>create account</button>
      <button onClick={() => { void signInWithGoogle() }}>continue with google</button>
      {error && <div style={{ color: 'crimson', fontSize: 12 }}>{error}</div>}
    </div>
  )
}


