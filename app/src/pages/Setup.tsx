// 첫 실행 — 최초 관리자(의료인) 계정 생성 + 기관명 설정.
import { useState } from 'react'
import { useAuth } from '@/state'
import { saveSettings } from '@/lib/settings'

export function Setup() {
  const { setupAdmin } = useAuth()
  const [orgName, setOrgName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [license, setLicense] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr('')
    if (password.length < 8) return setErr('비밀번호는 8자 이상이어야 합니다.')
    if (password !== password2) return setErr('비밀번호가 일치하지 않습니다.')
    setBusy(true)
    try {
      await saveSettings({ orgName: orgName.trim() })
      await setupAdmin({ username, password, displayName, license })
    } catch (e2) {
      setErr((e2 as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-wrap">
      <form className="panel auth-card" onSubmit={submit}>
        <h2>🌿 시스템 초기 설정</h2>
        <p className="muted">
          최초 1회 — 의료기관과 관리자(의료인) 계정을 만듭니다. 이 비밀번호는 데이터 암호화 키를
          보호하며, <b>분실 시 복구할 수 없습니다.</b>
        </p>
        <div className="field">
          <label>의료기관명</label>
          <input value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="○○한의원" required />
        </div>
        <div className="field">
          <label>의료인 성명 (작성자)</label>
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
        </div>
        <div className="field">
          <label>면허번호 (선택)</label>
          <input value={license} onChange={(e) => setLicense(e.target.value)} />
        </div>
        <div className="field">
          <label>로그인 아이디</label>
          <input value={username} onChange={(e) => setUsername(e.target.value)} required autoComplete="username" />
        </div>
        <div className="field">
          <label>비밀번호 (8자 이상)</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" />
        </div>
        <div className="field">
          <label>비밀번호 확인</label>
          <input type="password" value={password2} onChange={(e) => setPassword2(e.target.value)} required autoComplete="new-password" />
        </div>
        {err && <p className="error-text">{err}</p>}
        <button className="primary" type="submit" disabled={busy} style={{ width: '100%' }}>
          {busy ? '생성 중…' : '시스템 시작'}
        </button>
      </form>
    </div>
  )
}
