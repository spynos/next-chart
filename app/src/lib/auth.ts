// 인증 · 계정 관리 (FR-06, NFR-03, §6.5)
// - 첫 실행: 관리자 계정 생성 시 DEK 발급, 비밀번호 파생 KEK로 래핑
// - 로그인: wrappedDek 복원 성공 = 인증 성공, DEK는 세션 메모리에만
// - 사용자 추가: 현재 세션 DEK를 신규 사용자 비밀번호로 재래핑(봉투 암호화)

import { generateDek, unwrapDek, wrapDek } from './crypto'
import { idbAdd, idbGetAll, idbGetByIndex, idbPut, STORES } from './idb'
import type { Role, User } from './types'
import { audit, auditUnauthed } from './audit'
import { clearSession, getDek, getUser, setSession } from './session'

function uid(): string {
  return crypto.randomUUID()
}

export async function isInitialized(): Promise<boolean> {
  const users = await idbGetAll<User>(STORES.users)
  return users.length > 0
}

export async function listUsers(): Promise<User[]> {
  return idbGetAll<User>(STORES.users)
}

/** 첫 실행 — 최초 관리자(의료인) 계정 생성 + DEK 발급 */
export async function setupAdmin(input: {
  username: string
  password: string
  displayName: string
  license?: string
}): Promise<User> {
  if (await isInitialized()) throw new Error('이미 초기화된 시스템입니다.')
  const dek = await generateDek()
  const wrappedDek = await wrapDek(dek, input.password)
  const user: User = {
    id: uid(),
    username: input.username.trim(),
    displayName: input.displayName.trim(),
    role: 'admin',
    license: input.license?.trim() || undefined,
    wrappedDek,
    createdAt: new Date().toISOString(),
  }
  await idbAdd<User>(STORES.users, user)
  setSession(dek, user)
  await audit('user_create', {
    targetType: 'user',
    targetId: user.id,
    detail: `최초 관리자 계정 생성: ${user.username}`,
  })
  await audit('login', { detail: '최초 설정 로그인' })
  return user
}

export async function login(username: string, password: string): Promise<User> {
  const matches = await idbGetByIndex<User>(STORES.users, 'username', username.trim())
  const user = matches[0]
  if (!user) {
    await auditUnauthed('login_failed', `존재하지 않는 계정: ${username}`)
    throw new Error('아이디 또는 비밀번호가 올바르지 않습니다.')
  }
  if (user.disabledAt) {
    await auditUnauthed('login_failed', `말소된 계정 로그인 시도: ${username}`)
    throw new Error('말소된 계정입니다. 관리자에게 문의하세요.')
  }
  let dek: CryptoKey
  try {
    dek = await unwrapDek(user.wrappedDek, password)
  } catch {
    await auditUnauthed('login_failed', `비밀번호 불일치: ${username}`)
    throw new Error('아이디 또는 비밀번호가 올바르지 않습니다.')
  }
  setSession(dek, user)
  await audit('login', { detail: `로그인: ${user.username}` })
  return user
}

export async function logout(): Promise<void> {
  try {
    await audit('logout', {})
  } finally {
    clearSession()
  }
}

/** 사용자 추가 (관리자만). 현재 세션 DEK를 신규 비밀번호로 재래핑. */
export async function addUser(input: {
  username: string
  password: string
  displayName: string
  role: Role
  license?: string
}): Promise<User> {
  const me = getUser()
  if (me.role !== 'admin') throw new Error('계정 추가 권한이 없습니다.')
  const existing = await idbGetByIndex<User>(STORES.users, 'username', input.username.trim())
  if (existing.length) throw new Error('이미 존재하는 아이디입니다.')
  const dek = getDek() // 세션의 동일 DEK를 공유 (단일 기관 단일 DB)
  const wrappedDek = await wrapDek(dek, input.password)
  const user: User = {
    id: uid(),
    username: input.username.trim(),
    displayName: input.displayName.trim(),
    role: input.role,
    license: input.license?.trim() || undefined,
    wrappedDek,
    createdAt: new Date().toISOString(),
  }
  await idbAdd<User>(STORES.users, user)
  await audit('user_create', {
    targetType: 'user',
    targetId: user.id,
    detail: `계정 생성: ${user.username} (${user.role})`,
  })
  return user
}

/** 퇴직자 등 계정 말소 (§6.5). 로그인 차단 — 감사로그는 보존. */
export async function disableUser(userId: string): Promise<void> {
  const me = getUser()
  if (me.role !== 'admin') throw new Error('권한이 없습니다.')
  if (me.id === userId) throw new Error('본인 계정은 말소할 수 없습니다.')
  const users = await idbGetAll<User>(STORES.users)
  const u = users.find((x) => x.id === userId)
  if (!u) throw new Error('계정을 찾을 수 없습니다.')
  u.disabledAt = new Date().toISOString()
  await idbPut<User>(STORES.users, u)
  await audit('user_disable', {
    targetType: 'user',
    targetId: userId,
    detail: `계정 말소: ${u.username}`,
  })
}
