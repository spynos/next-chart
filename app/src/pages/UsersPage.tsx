// 계정 관리 (관리자 전용) — 추가, 말소 (FR-06, §6.5)
import { useEffect, useState } from 'react'
import { addUser, disableUser, listUsers } from '@/lib/auth'
import { useAuth } from '@/state'
import type { Role, User } from '@/lib/types'
import { fmtDateTime } from '@/lib/format'

export function UsersPage() {
  const { user: me } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [show, setShow] = useState(false)

  const reload = async () => setUsers(await listUsers())
  useEffect(() => {
    void reload()
  }, [])

  if (me?.role !== 'admin') {
    return <div className="panel">접근 권한이 없습니다. (관리자 전용)</div>
  }

  const onDisable = async (u: User) => {
    if (!confirm(`'${u.username}' 계정을 말소합니다. 로그인이 차단됩니다. 계속할까요?`)) return
    await disableUser(u.id)
    await reload()
  }

  return (
    <div>
      <div className="panel">
        <div className="row">
          <h2 style={{ margin: 0 }}>계정 관리</h2>
          <span className="spacer" />
          <button className="primary" onClick={() => setShow((s) => !s)}>
            {show ? '닫기' : '+ 계정 추가'}
          </button>
        </div>
        <p className="muted" style={{ marginTop: 6 }}>
          계정은 개인별로 부여하고 공유하지 않습니다. 신규 계정은 현재 데이터 암호화 키를 새 비밀번호로 안전하게
          공유받습니다(봉투 암호화).
        </p>
      </div>

      {show && (
        <NewUserForm
          onCreated={async () => {
            setShow(false)
            await reload()
          }}
        />
      )}

      <div className="panel">
        <table>
          <thead>
            <tr>
              <th>아이디</th>
              <th>성명</th>
              <th>권한</th>
              <th>생성일</th>
              <th>상태</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.username}</td>
                <td>{u.displayName}</td>
                <td>{roleLabel(u.role)}</td>
                <td>{fmtDateTime(u.createdAt)}</td>
                <td>
                  {u.disabledAt ? (
                    <span className="badge unsigned">말소됨</span>
                  ) : (
                    <span className="badge signed">활성</span>
                  )}
                </td>
                <td>
                  {!u.disabledAt && u.id !== me.id && (
                    <button className="danger" onClick={() => onDisable(u)}>
                      말소
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function NewUserForm({ onCreated }: { onCreated: () => void }) {
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Role>('doctor')
  const [license, setLicense] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr('')
    if (password.length < 8) return setErr('비밀번호는 8자 이상이어야 합니다.')
    setBusy(true)
    try {
      await addUser({ username, password, displayName, role, license })
      onCreated()
    } catch (e2) {
      setErr((e2 as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="panel" onSubmit={submit}>
      <h3>새 계정</h3>
      <div className="form-grid">
        <div className="field third">
          <span className="field-label">아이디</span>
          <input value={username} onChange={(e) => setUsername(e.target.value)} required autoComplete="off" />
        </div>
        <div className="field third">
          <span className="field-label">성명</span>
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
        </div>
        <div className="field third">
          <span className="field-label">권한</span>
          <select value={role} onChange={(e) => setRole(e.target.value as Role)}>
            <option value="doctor">의료인</option>
            <option value="staff">직원(간호/원무)</option>
            <option value="admin">관리자</option>
          </select>
        </div>
        <div className="field third">
          <span className="field-label">면허번호 (선택)</span>
          <input value={license} onChange={(e) => setLicense(e.target.value)} />
        </div>
        <div className="field third">
          <span className="field-label">초기 비밀번호 (8자 이상)</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" />
        </div>
      </div>
      {err && <p className="error-text">{err}</p>}
      <div className="row" style={{ marginTop: 12 }}>
        <span className="spacer" />
        <button className="primary" type="submit" disabled={busy}>
          {busy ? '생성 중…' : '계정 생성'}
        </button>
      </div>
    </form>
  )
}

function roleLabel(role: Role): string {
  return role === 'admin' ? '관리자' : role === 'doctor' ? '의료인' : '직원'
}
