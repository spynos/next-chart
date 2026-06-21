import type { ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '@/state'

export function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const isAdmin = user?.role === 'admin'

  const onLogout = async () => {
    await logout()
    navigate('/')
  }

  return (
    <div className="app-shell">
      <header className="topbar no-print">
        <span className="brand">🌿 난임 한의 진료기록</span>
        <nav>
          <NavLink to="/" end>대시보드</NavLink>
          <NavLink to="/patients">환자</NavLink>
          <NavLink to="/audit">감사로그</NavLink>
          <NavLink to="/backup">백업</NavLink>
          {isAdmin && <NavLink to="/users">계정</NavLink>}
        </nav>
        <span className="spacer" />
        <span className="user-chip">
          {user?.displayName} ({roleLabel(user?.role)})
        </span>
        <button onClick={onLogout}>잠금/로그아웃</button>
      </header>
      <div className="authenticity-banner no-print">
        ⚠ 공식 진료기록부는 <b>출력·자필서명한 종이</b>입니다. 이 화면과 DB는 작성을 돕는 보조 자료입니다.
        진료 직후 지체 없이 출력·서명·보존하십시오.
      </div>
      <main className="content">{children}</main>
    </div>
  )
}

function roleLabel(role?: string): string {
  switch (role) {
    case 'admin':
      return '관리자/의료인'
    case 'doctor':
      return '의료인'
    case 'staff':
      return '직원'
    default:
      return ''
  }
}
