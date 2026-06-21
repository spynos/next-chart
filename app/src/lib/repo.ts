// 암호화 레포지토리 (NFR-01)
// patient/chart/printout 은 payload를 DEK로 암호화하여 저장한다.
// 검색/인덱스에 필요한 식별자(opaque UUID)만 평문으로 둔다.

import { decryptJson, encryptJson, sha256Hex, type Encrypted } from './crypto'
import {
  idbAdd,
  idbGet,
  idbGetAll,
  idbGetByIndex,
  idbPut,
  STORES,
} from './idb'
import { getDek, getUser } from './session'
import { audit } from './audit'
import type { Chart, ChartType, Patient, Printout } from './types'

function uid(): string {
  return crypto.randomUUID()
}
function nowIso(): string {
  return new Date().toISOString()
}

// ---------- Patient ----------
interface EncRecord {
  id: string
  enc: Encrypted
}

export async function createPatient(
  p: Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<Patient> {
  const patient: Patient = { ...p, id: uid(), createdAt: nowIso(), updatedAt: nowIso() }
  await idbAdd<EncRecord>(STORES.patients, {
    id: patient.id,
    enc: await encryptJson(getDek(), patient),
  })
  await audit('patient_create', {
    targetType: 'patient',
    targetId: patient.id,
    detail: `환자 등록: ${patient.name} (등록번호 ${patient.chartNo})`,
  })
  return patient
}

// 감사 없이 환자 레코드를 암호화 저장(내부용). updatedAt 갱신.
async function writePatient(patient: Patient): Promise<Patient> {
  const updated = { ...patient, updatedAt: nowIso() }
  await idbPut<EncRecord>(STORES.patients, {
    id: updated.id,
    enc: await encryptJson(getDek(), updated),
  })
  return updated
}

export async function updatePatient(patient: Patient): Promise<Patient> {
  const updated = await writePatient(patient)
  await audit('patient_update', {
    targetType: 'patient',
    targetId: updated.id,
    detail: `환자 정보 수정: ${updated.name}`,
  })
  return updated
}

/** 부부(배우자) 연결 — 양방향 spouseId 설정. 기존 연결은 먼저 해제. */
export async function linkSpouse(aId: string, bId: string): Promise<void> {
  if (aId === bId) throw new Error('같은 환자끼리는 연결할 수 없습니다.')
  const a = await getPatient(aId)
  const b = await getPatient(bId)
  if (!a || !b) throw new Error('환자를 찾을 수 없습니다.')
  // 양측의 기존 배우자 연결 해제(다른 상대와 묶여 있던 경우)
  for (const prevId of [a.spouseId, b.spouseId]) {
    if (prevId && prevId !== aId && prevId !== bId) {
      const prev = await getPatient(prevId)
      if (prev && prev.spouseId && (prev.spouseId === aId || prev.spouseId === bId)) {
        prev.spouseId = undefined
        await writePatient(prev)
      }
    }
  }
  a.spouseId = bId
  b.spouseId = aId
  await writePatient(a)
  await writePatient(b)
  await audit('patient_update', {
    targetType: 'patient',
    targetId: aId,
    detail: `부부 연결: ${a.name} ↔ ${b.name}`,
  })
}

/** 부부 연결 해제 — 양방향 해제. */
export async function unlinkSpouse(aId: string): Promise<void> {
  const a = await getPatient(aId)
  if (!a) throw new Error('환자를 찾을 수 없습니다.')
  const partnerId = a.spouseId
  a.spouseId = undefined
  await writePatient(a)
  if (partnerId) {
    const b = await getPatient(partnerId)
    if (b && b.spouseId === aId) {
      b.spouseId = undefined
      await writePatient(b)
    }
  }
  await audit('patient_update', {
    targetType: 'patient',
    targetId: aId,
    detail: `부부 연결 해제: ${a.name}`,
  })
}

export async function getPatient(id: string): Promise<Patient | undefined> {
  const rec = await idbGet<EncRecord>(STORES.patients, id)
  if (!rec) return undefined
  return decryptJson<Patient>(getDek(), rec.enc)
}

export async function listPatients(): Promise<Patient[]> {
  const recs = await idbGetAll<EncRecord>(STORES.patients)
  const dek = getDek()
  const out: Patient[] = []
  for (const r of recs) out.push(await decryptJson<Patient>(dek, r.enc))
  return out.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

// ---------- Chart ----------
interface ChartRecord {
  id: string
  patientId: string
  enc: Encrypted
}

export async function createChart(input: {
  patientId: string
  type: ChartType
  cycle?: number
  title: string
  data?: Record<string, unknown>
}): Promise<Chart> {
  const me = getUser()
  const chart: Chart = {
    id: uid(),
    patientId: input.patientId,
    type: input.type,
    cycle: input.cycle,
    title: input.title,
    data: input.data ?? {},
    authorId: me.id,
    authorName: me.displayName,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    status: 'draft',
  }
  await idbAdd<ChartRecord>(STORES.charts, {
    id: chart.id,
    patientId: chart.patientId,
    enc: await encryptJson(getDek(), chart),
  })
  await audit('chart_create', {
    targetType: 'chart',
    targetId: chart.id,
    detail: `차트 생성: ${chart.title}`,
  })
  return chart
}

export async function saveChart(chart: Chart): Promise<Chart> {
  const updated: Chart = { ...chart, updatedAt: nowIso() }
  await idbPut<ChartRecord>(STORES.charts, {
    id: updated.id,
    patientId: updated.patientId,
    enc: await encryptJson(getDek(), updated),
  })
  await audit('chart_update', {
    targetType: 'chart',
    targetId: updated.id,
    detail: `차트 저장: ${updated.title} (${updated.status})`,
  })
  return updated
}

export async function getChart(id: string): Promise<Chart | undefined> {
  const rec = await idbGet<ChartRecord>(STORES.charts, id)
  if (!rec) return undefined
  return decryptJson<Chart>(getDek(), rec.enc)
}

export async function listChartsByPatient(patientId: string): Promise<Chart[]> {
  const recs = await idbGetByIndex<ChartRecord>(STORES.charts, 'patientId', patientId)
  const dek = getDek()
  const out: Chart[] = []
  for (const r of recs) out.push(await decryptJson<Chart>(dek, r.enc))
  return out.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

// ---------- Printout (출력본 스냅샷, AR-03) ----------
interface PrintoutRecord {
  id: string
  chartId: string
  patientId: string
  docHash: string
  enc: Encrypted
}

/** 출력 스냅샷 생성 — 차트 데이터를 동결하고 문서 해시 저장 (PDF 저장 / 즉시 출력 공통) */
export async function createPrintout(input: {
  chart: Chart
  outputType: import('./types').OutputType
  amendmentOf?: string
}): Promise<Printout> {
  const me = getUser()
  const { chart, outputType } = input
  const snapshot = JSON.parse(JSON.stringify(chart.data)) as Record<string, unknown>
  // 문서 해시: 차트 타입 + 환자 + 데이터의 정규화 직렬화
  const docHash = await sha256Hex(
    JSON.stringify({ type: chart.type, patientId: chart.patientId, data: snapshot }),
  )
  const printout: Printout = {
    id: uid(),
    chartId: chart.id,
    patientId: chart.patientId,
    chartType: chart.type,
    snapshot,
    docHash,
    outputType,
    printedBy: me.id,
    printedByName: me.displayName,
    printedAt: nowIso(),
    amendmentOf: input.amendmentOf,
  }
  await idbAdd<PrintoutRecord>(STORES.printouts, {
    id: printout.id,
    chartId: printout.chartId,
    patientId: printout.patientId,
    docHash,
    enc: await encryptJson(getDek(), printout),
  })
  await audit('print', {
    targetType: 'printout',
    targetId: printout.id,
    detail: `출력본 생성 [${outputType === 'pdf' ? 'PDF 저장' : '즉시 출력'}] (차트 ${chart.id}) 해시 ${docHash.slice(
      0,
      12,
    )}…${input.amendmentOf ? ' [정정본]' : ''}`,
  })
  return printout
}

export async function listPrintoutsByChart(chartId: string): Promise<Printout[]> {
  const recs = await idbGetByIndex<PrintoutRecord>(STORES.printouts, 'chartId', chartId)
  const dek = getDek()
  const out: Printout[] = []
  for (const r of recs) out.push(await decryptJson<Printout>(dek, r.enc))
  return out.sort((a, b) => a.printedAt.localeCompare(b.printedAt))
}

export async function listPrintoutsByPatient(patientId: string): Promise<Printout[]> {
  const recs = await idbGetByIndex<PrintoutRecord>(STORES.printouts, 'patientId', patientId)
  const dek = getDek()
  const out: Printout[] = []
  for (const r of recs) out.push(await decryptJson<Printout>(dek, r.enc))
  return out.sort((a, b) => b.printedAt.localeCompare(a.printedAt))
}

/** 최근 출력본 (대시보드용) */
export async function listRecentPrintouts(limit = 10): Promise<Printout[]> {
  const recs = await idbGetAll<PrintoutRecord>(STORES.printouts)
  const dek = getDek()
  const out: Printout[] = []
  for (const r of recs) out.push(await decryptJson<Printout>(dek, r.enc))
  return out.sort((a, b) => b.printedAt.localeCompare(a.printedAt)).slice(0, limit)
}
