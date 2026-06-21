// 백업/복구 (NFR-07) 및 감사로그 내보내기 (NFR-05)
// - 백업: 모든 스토어의 raw 레코드 덤프. payload는 이미 DEK로 암호화되어 있어
//   백업본도 암호화 상태로 유지된다(키 없이는 복호화 불가).
// - 감사로그 내보내기: 별도 물리 매체 보관용. 해시체인 포함.

import { idbGetAll, idbPut, openDb, STORES } from './idb'
import { audit, readAuditLog } from './audit'

const STORE_LIST = [
  STORES.meta,
  STORES.users,
  STORES.patients,
  STORES.charts,
  STORES.printouts,
  STORES.audit,
] as const

export interface BackupFile {
  format: 'nextchart-backup'
  version: 1
  exportedAt: string
  encrypted: true
  stores: Record<string, unknown[]>
}

export async function exportBackup(): Promise<BackupFile> {
  const stores: Record<string, unknown[]> = {}
  for (const s of STORE_LIST) {
    stores[s] = await idbGetAll(s)
  }
  await audit('backup_export', { detail: '전체 백업 내보내기(암호화 상태)' })
  return {
    format: 'nextchart-backup',
    version: 1,
    exportedAt: new Date().toISOString(),
    encrypted: true,
    stores,
  }
}

/** 복구 — 기존 데이터 위에 덮어쓴다. 같은 DEK(동일 비밀번호) 필요. */
export async function restoreBackup(file: BackupFile): Promise<void> {
  if (file.format !== 'nextchart-backup') throw new Error('올바른 백업 파일이 아닙니다.')
  await openDb()
  for (const s of STORE_LIST) {
    const records = file.stores[s] ?? []
    for (const r of records) await idbPut(s, r)
  }
  await audit('restore', { detail: `백업 복구 (${file.exportedAt})` })
}

/** 감사로그 내보내기 — 별도 매체 보관용(평문 가독, 체인검증 포함) */
export async function exportAuditLog(): Promise<{
  format: 'nextchart-audit'
  exportedAt: string
  entries: unknown[]
  chainIntact: boolean
}> {
  const entries = await readAuditLog()
  const chainIntact = entries.every((e) => e.chainValid)
  await audit('audit_export', {
    detail: `감사로그 내보내기 (${entries.length}건, 체인 ${chainIntact ? '정상' : '손상'})`,
  })
  return {
    format: 'nextchart-audit',
    exportedAt: new Date().toISOString(),
    entries,
    chainIntact,
  }
}

/** 브라우저에서 JSON 파일 다운로드 */
export function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
