// 런타임 세션 상태 — DEK는 디스크에 절대 저장하지 않고 메모리에만 보관.
// 화면 잠금/로그아웃 시 폐기 (NFR-06).

import type { User } from './types'

interface SessionState {
  dek: CryptoKey | null
  user: User | null
}

const state: SessionState = { dek: null, user: null }

export function setSession(dek: CryptoKey, user: User) {
  state.dek = dek
  state.user = user
}

export function clearSession() {
  state.dek = null
  state.user = null
}

export function getDek(): CryptoKey {
  if (!state.dek) throw new Error('세션이 잠겨 있습니다. 다시 로그인하세요.')
  return state.dek
}

export function getUser(): User {
  if (!state.user) throw new Error('로그인이 필요합니다.')
  return state.user
}

export function currentUserOrNull(): User | null {
  return state.user
}

export function isAuthed(): boolean {
  return state.dek !== null && state.user !== null
}
