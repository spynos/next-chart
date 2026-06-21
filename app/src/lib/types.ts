// 도메인 타입 (계획서 §5.2 데이터 모델)

export type Role = 'admin' | 'doctor' | 'staff'

export interface User {
  id: string
  username: string
  displayName: string
  role: Role
  license?: string // 면허번호(의료인)
  wrappedDek: import('./crypto').WrappedDek
  createdAt: string
  disabledAt?: string // 퇴직자 계정 말소 (§6.5)
}

export type Sex = 'female' | 'male'

/** 환자 인적사항. 민감/고유식별 필드 포함 → 레코드 전체 암호화 저장. */
export interface Patient {
  id: string
  chartNo: string // 등록번호(전산관리번호) — 주민번호 대체 식별 가능
  name: string
  sex: Sex
  birthDate: string // YYYY-MM-DD
  rrn?: string // 주민등록번호(고유식별정보, 선택)
  phone?: string
  address?: string
  job?: string
  firstVisitDate?: string
  spouseId?: string // 배우자(부부) 연결
  createdAt: string
  updatedAt: string
}

export type ChartType =
  | 'initial_female'
  | 'initial_male'
  | 'cycle_female'
  | 'cycle_male'
  | 'result_female'

/** 진료기록(차트). data는 폼 스키마 필드 id → 값. */
export interface Chart {
  id: string
  patientId: string
  type: ChartType
  cycle?: number // 주기 경과기록지 1~4
  title: string
  data: Record<string, unknown>
  authorId: string // 작성 의료인
  authorName: string
  createdAt: string
  updatedAt: string
  status: 'draft' | 'printed' | 'amended'
}

export type OutputType = 'pdf' | 'print'

/** 출력본 스냅샷 (AR-03). 출력 시점의 종이 진본 ↔ DB 상태 대응. */
export interface Printout {
  id: string
  chartId: string
  patientId: string
  chartType: ChartType
  snapshot: Record<string, unknown> // 출력 시점 데이터 동결본
  docHash: string // 문서 SHA-256
  outputType: OutputType // PDF 저장 / 즉시 출력(프린터)
  printedBy: string
  printedByName: string
  printedAt: string
  amendmentOf?: string // 정정본인 경우 원본 printout id (AR-04)
}

export type AuditAction =
  | 'login'
  | 'logout'
  | 'login_failed'
  | 'patient_create'
  | 'patient_update'
  | 'patient_view'
  | 'chart_create'
  | 'chart_update'
  | 'chart_view'
  | 'print'
  | 'amend'
  | 'user_create'
  | 'user_disable'
  | 'backup_export'
  | 'audit_export'
  | 'restore'

/** 감사로그 (NFR-04). append-only + 해시체인. */
export interface AuditEntry {
  seq: number
  action: AuditAction
  actorId: string
  actorName: string
  targetType?: string
  targetId?: string
  detail?: string
  at: string
  prevHash: string
  hash: string
}
