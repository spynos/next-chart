// 감사로그 (NFR-04, §4.6)
// - append-only: 기존 레코드 수정/삭제 없음 (코드 레벨에서 추가만 허용)
// - 해시체인: hash_n = SHA256(canonical(entry, prevHash)) → 사후 변조/삭제/재정렬 탐지
// - 상세(detail)는 DEK로 암호화 저장, 체인 검증용 메타(seq/at/hash)는 평문
// - 보관 2년 이상, 별도 매체 내보내기 지원 (NFR-05)

import { decryptJson, encryptJson, sha256Hex, type Encrypted } from './crypto'
import { idbAdd, idbGet, idbGetAll, idbPut, STORES } from './idb'
import type { AuditAction, AuditEntry } from './types'
import { getDek, currentUserOrNull } from './session'

const GENESIS_HASH = '0'.repeat(64)

interface AuditHead {
  id: 'audit_head'
  seq: number
  hash: string
}

interface AuditFields {
  seq: number
  at: string
  action: AuditAction
  actorId: string
  actorName: string
  targetType: string | null
  targetId: string | null
  detail: string | null
  prevHash: string
}

// 디스크 저장 형태: 체인 메타는 평문, 상세는 암호문(enc) — 단 미인증 기록은 plainDetail
interface StoredAudit {
  seq: number
  at: string
  action: AuditAction
  actorId: string
  prevHash: string
  hash: string
  enc: Encrypted // { actorName, targetType, targetId, detail }
  plainDetail?: string
  plainActorName?: string
}

function canonical(f: AuditFields): string {
  return JSON.stringify([
    f.seq,
    f.at,
    f.action,
    f.actorId,
    f.actorName,
    f.targetType,
    f.targetId,
    f.detail,
    f.prevHash,
  ])
}

async function getHead(): Promise<AuditHead> {
  const h = await idbGet<AuditHead>(STORES.meta, 'audit_head')
  return h ?? { id: 'audit_head', seq: 0, hash: GENESIS_HASH }
}

// 해시체인은 순서 의존적이다. head 읽기→레코드 추가→head 갱신이 원자적이지 않으므로
// 동시 호출(예: React 이펙트 중복 발생) 시 seq 충돌이 날 수 있다.
// 모듈 단위 직렬화 큐로 append를 순차 실행하여 체인 무결성을 보장한다.
let chainTail: Promise<void> = Promise.resolve()

async function appendChain(
  fields: Omit<AuditFields, 'seq' | 'at' | 'prevHash'>,
  store: (f: AuditFields, hash: string) => Promise<void>,
): Promise<void> {
  const run = chainTail.then(async () => {
    const head = await getHead()
    const full: AuditFields = {
      ...fields,
      seq: head.seq + 1,
      at: new Date().toISOString(),
      prevHash: head.hash,
    }
    const hash = await sha256Hex(canonical(full))
    await store(full, hash)
    await idbPut<AuditHead>(STORES.meta, { id: 'audit_head', seq: full.seq, hash })
  })
  // 큐는 거부되지 않도록 유지(개별 실패가 후속 append를 막지 않게)
  chainTail = run.catch(() => {})
  return run
}

/** 감사 이벤트 기록 (인증 세션). 상세는 암호화 저장. */
export async function audit(
  action: AuditAction,
  opts: {
    targetType?: string
    targetId?: string
    detail?: string
    actorId?: string
    actorName?: string
  } = {},
): Promise<void> {
  const user = currentUserOrNull()
  const actorId = opts.actorId ?? user?.id ?? 'anonymous'
  const actorName = opts.actorName ?? user?.displayName ?? '미인증'
  await appendChain(
    {
      action,
      actorId,
      actorName,
      targetType: opts.targetType ?? null,
      targetId: opts.targetId ?? null,
      detail: opts.detail ?? null,
    },
    async (f, hash) => {
      const enc = await encryptJson(getDek(), {
        actorName: f.actorName,
        targetType: f.targetType,
        targetId: f.targetId,
        detail: f.detail,
      })
      await idbAdd<StoredAudit>(STORES.audit, {
        seq: f.seq,
        at: f.at,
        action: f.action,
        actorId: f.actorId,
        prevHash: f.prevHash,
        hash,
        enc,
      })
    },
  )
}

/** DEK 없는 시점(로그인 실패 등)의 기록. 상세는 평문(민감정보 아님). */
export async function auditUnauthed(action: AuditAction, detail: string): Promise<void> {
  await appendChain(
    {
      action,
      actorId: 'anonymous',
      actorName: '미인증',
      targetType: null,
      targetId: null,
      detail,
    },
    async (f, hash) => {
      await idbAdd<StoredAudit>(STORES.audit, {
        seq: f.seq,
        at: f.at,
        action: f.action,
        actorId: f.actorId,
        prevHash: f.prevHash,
        hash,
        enc: { iv: '', ct: '' },
        plainDetail: detail,
        plainActorName: '미인증',
      })
    },
  )
}

export interface DecodedAudit extends AuditEntry {
  chainValid: boolean
}

/** 전체 감사로그를 복호화하고 해시체인을 검증하여 반환 */
export async function readAuditLog(): Promise<DecodedAudit[]> {
  const raw = (await idbGetAll<StoredAudit>(STORES.audit)).sort((a, b) => a.seq - b.seq)
  const out: DecodedAudit[] = []
  let prev = GENESIS_HASH
  const dek = getDek()
  for (const r of raw) {
    let actorName = r.plainActorName ?? '미인증'
    let targetType: string | null = null
    let targetId: string | null = null
    let detail: string | null = r.plainDetail ?? null
    if (r.enc.ct) {
      try {
        const d = await decryptJson<{
          actorName: string
          targetType: string | null
          targetId: string | null
          detail: string | null
        }>(dek, r.enc)
        actorName = d.actorName
        targetType = d.targetType
        targetId = d.targetId
        detail = d.detail
      } catch {
        detail = '(복호화 실패)'
      }
    }
    const recomputed = await sha256Hex(
      canonical({
        seq: r.seq,
        at: r.at,
        action: r.action,
        actorId: r.actorId,
        actorName,
        targetType,
        targetId,
        detail,
        prevHash: r.prevHash,
      }),
    )
    const chainValid = r.prevHash === prev && recomputed === r.hash
    prev = r.hash
    out.push({
      seq: r.seq,
      action: r.action,
      actorId: r.actorId,
      actorName,
      targetType: targetType ?? undefined,
      targetId: targetId ?? undefined,
      detail: detail ?? undefined,
      at: r.at,
      prevHash: r.prevHash,
      hash: r.hash,
      chainValid,
    })
  }
  return out
}
