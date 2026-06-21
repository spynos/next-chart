// 서식 레지스트리 + 필수기재 검증 (FR-03/§3.2, 부록 A)
import type { Chart, ChartType, Patient } from '@/lib/types'
import type { Field, FormSchema, Section } from './schema'
import { femaleInitial } from './femaleInitial'
import { maleInitial } from './maleInitial'
import { femaleCycle } from './femaleCycle'
import { maleCycle } from './maleCycle'
import { femaleResult } from './femaleResult'

const REGISTRY: Record<ChartType, FormSchema> = {
  initial_female: femaleInitial,
  initial_male: maleInitial,
  cycle_female: femaleCycle,
  cycle_male: maleCycle,
  result_female: femaleResult,
}

export function getSchema(type: ChartType): FormSchema {
  return REGISTRY[type]
}

export interface ChartTypeOption {
  type: ChartType
  label: string
  sex: 'female' | 'male'
  cycle?: boolean
}

export const CHART_TYPE_OPTIONS: ChartTypeOption[] = [
  { type: 'initial_female', label: '초진 (여성)', sex: 'female' },
  { type: 'cycle_female', label: '주기 경과기록지 (여성)', sex: 'female', cycle: true },
  { type: 'result_female', label: '치료 결과지 (여성)', sex: 'female' },
  { type: 'initial_male', label: '초진 (남성)', sex: 'male' },
  { type: 'cycle_male', label: '주기 경과기록지 (남성)', sex: 'male', cycle: true },
]

export function allFields(schema: FormSchema): Field[] {
  return schema.sections.flatMap((s: Section) => s.fields)
}

function isEmpty(v: unknown): boolean {
  if (v == null) return true
  if (typeof v === 'string') return v.trim() === ''
  if (Array.isArray(v)) return v.length === 0
  return false
}

export interface ValidationIssue {
  level: 'error' | 'warn'
  message: string
}

/**
 * 출력(진본화) 전 검증.
 * - 의료법 시행규칙 제14조 필수기재(부록 A): 인적사항/진료일시/진단/치료내용/주된증상
 * - 스키마 required 필드 누락 차단
 */
export function validateForPrint(
  schema: FormSchema,
  chart: Chart,
  patient: Patient,
): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const data = chart.data

  // 부록 A 가. 인적사항 (환자 레코드 기반)
  if (isEmpty(patient.name)) issues.push({ level: 'error', message: '환자 성명 누락' })
  if (isEmpty(patient.chartNo) && isEmpty(patient.rrn))
    issues.push({ level: 'error', message: '환자 식별정보(등록번호 또는 주민번호) 누락' })

  // 부록 A 바. 진료 일시 — 초진일자/작성일/작성일자 중 하나
  const dateField = allFields(schema).find((f) =>
    ['visit_date', 'record_date', 'result_date'].includes(f.id),
  )
  if (dateField && isEmpty(data[dateField.id]))
    issues.push({ level: 'error', message: '진료 일시 누락 (의료법 필수기재)' })

  // 스키마 required 필드
  for (const f of allFields(schema)) {
    if (f.required && isEmpty(data[f.id])) {
      issues.push({ level: 'error', message: `필수 항목 누락: ${f.label}` })
    }
  }

  // 부록 A 마. 치료내용 — 초진/주기 차트는 한약 또는 침치료 중 하나 권고
  if (chart.type === 'initial_female' || chart.type === 'initial_male') {
    const hasTx =
      !isEmpty(data['init_herb_name']) || !isEmpty(data['init_acu_types'])
    if (!hasTx)
      issues.push({ level: 'warn', message: '치료내용(한약/침치료) 미입력 — 권고' })
  }

  return issues
}

/** 순응도 자동계산 (계획서 서식: 시행/계획 × 100) */
export function computeCompliance(data: Record<string, unknown>): {
  med?: number
  acu?: number
} {
  const num = (v: unknown) => (typeof v === 'number' ? v : Number(v))
  const medP = num(data['cyc_med_prescribed'])
  const medT = num(data['cyc_med_taken'])
  const acuP = num(data['cyc_acu_planned'])
  const acuT = num(data['cyc_acu_done'])
  const out: { med?: number; acu?: number } = {}
  if (medP > 0) out.med = Math.round((medT / medP) * 100)
  if (acuP > 0) out.acu = Math.round((acuT / acuP) * 100)
  return out
}
