import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { User } from '@/lib/types'
import * as auth from '@/lib/auth'
import { isAuthed } from '@/lib/session'

// 유휴 자동잠금 (NFR-06) — 10분 무동작 시 세션 잠금
const IDLE_MS = 10 * 60 * 1000

interface AuthCtx {
  ready: boolean
  initialized: boolean
  user: User | null
  setupAdmin: typeof auth.setupAdmin
  login: (u: string, p: string) => Promise<void>
  logout: () => Promise<void>
  refreshInit: () => Promise<void>
}

const Ctx = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const idleTimer = useRef<number | undefined>(undefined)

  const refreshInit = useCallback(async () => {
    setInitialized(await auth.isInitialized())
  }, [])

  useEffect(() => {
    void (async () => {
      await refreshInit()
      setReady(true)
    })()
  }, [refreshInit])

  const doLogout = useCallback(async () => {
    if (isAuthed()) await auth.logout()
    setUser(null)
  }, [])

  // 유휴 타이머: 사용자 활동마다 리셋, 만료 시 자동 잠금
  useEffect(() => {
    if (!user) return
    const reset = () => {
      window.clearTimeout(idleTimer.current)
      idleTimer.current = window.setTimeout(() => {
        void doLogout()
        alert('일정 시간 동작이 없어 보안을 위해 자동 잠금되었습니다. 다시 로그인하세요.')
      }, IDLE_MS)
    }
    const events = ['mousedown', 'keydown', 'mousemove', 'touchstart']
    events.forEach((e) => window.addEventListener(e, reset))
    reset()
    return () => {
      window.clearTimeout(idleTimer.current)
      events.forEach((e) => window.removeEventListener(e, reset))
    }
  }, [user, doLogout])

  const value: AuthCtx = {
    ready,
    initialized,
    user,
    setupAdmin: async (input) => {
      const u = await auth.setupAdmin(input)
      setInitialized(true)
      setUser(u)
      return u
    },
    login: async (u, p) => {
      const usr = await auth.login(u, p)
      setUser(usr)
    },
    logout: doLogout,
    refreshInit,
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth(): AuthCtx {
  const c = useContext(Ctx)
  if (!c) throw new Error('useAuth must be used within AuthProvider')
  return c
}
