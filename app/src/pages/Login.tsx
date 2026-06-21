import { useState } from 'react'
import { useAuth } from '@/state'

export function Login() {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr('')
    setBusy(true)
    try {
      await login(username, password)
    } catch (e2) {
      setErr((e2 as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-wrap">
      <form className="panel auth-card" onSubmit={submit}>
        <h2>🌿 난임 한의 진료기록 관리</h2>
        <p className="muted">개인 계정으로 로그인하세요. (계정 공유 금지 · §6.5)</p>
        <div className="field">
          <label>아이디</label>
          <input value={username} onChange={(e) => setUsername(e.target.value)} required autoComplete="username" autoFocus />
        </div>
        <div className="field">
          <label>비밀번호</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
        </div>
        {err && <p className="error-text">{err}</p>}
        <button className="primary" type="submit" disabled={busy} style={{ width: '100%' }}>
          {busy ? '확인 중…' : '로그인'}
        </button>
      </form>
    </div>
  )
}
