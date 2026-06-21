// 서식 스키마 정의 (PDF 서식 → 구조화 데이터)
// 제너릭 FormRenderer가 이 스키마를 읽어 입력 UI와 인쇄 서식을 동시에 생성한다.

import type { ChartType } from '@/lib/types'

export type FieldKind =
  | 'text'
  | 'textarea'
  | 'number'
  | 'date'
  | 'radio' // 단일 선택
  | 'checks' // 다중 선택
  | 'scale' // 5점 척도(라디오)
  | 'heading' // 정적 소제목/안내

export type FieldWidth = 'full' | 'half' | 'third' | 'quarter'

export interface Field {
  id: string
  label: string
  kind: FieldKind
  options?: string[]
  unit?: string // 예: "잔/일", "회", "cm"
  placeholder?: string
  width?: FieldWidth // 기본 full
  required?: boolean // 의료법 필수기재/임상 핵심
  allowOther?: boolean // 옵션 외 자유입력 허용(기타)
  note?: string // 보조 설명(참고치 등)
}

export interface Section {
  id: string
  title: string
  fields: Field[]
}

export interface FormSchema {
  type: ChartType
  title: string
  sections: Section[]
}

export const SCALE_OPTIONS = ['매우심함', '심함', '보통', '약함', '거의없음']
export const YESNO = ['유', '무']
export const GOOD_LOW_NONE = ['양호', '저하', '없음']

// 변증(여성 5형 / 남성 4형)
export const PATTERN_FEMALE = [
  '신허(腎虛)형',
  '기혈허약(氣血虛弱)형',
  '간울(肝鬱)형',
  '습담(濕痰)형',
  '혈어(血瘀)형',
]
export const PATTERN_MALE = [
  '신양허(腎陽虛)형',
  '기혈허약(氣血虛弱)형',
  '기체혈어(氣滯血瘀)형',
  '담습조체(痰濕阻滯)형',
]
// 난임 변병(공통)
export const INFERTILITY_CAUSE = [
  '원인불명',
  '배란요인',
  '난관ㆍ복막요인',
  '자궁내막요인',
  '남성요인',
]

const IRRADIATION_AREA = [
  '두경부',
  '상지부',
  '하지부',
  '흉부',
  '상복부',
  '소복부',
  '요배부',
]

/** 치료계획/치료내용 공통 블록 (한약·침·뜸·적외선·기타) */
export function treatmentSection(idPrefix: string): Section {
  return {
    id: `${idPrefix}_treatment`,
    title: '치료 계획 / 치료 내용',
    fields: [
      { id: `${idPrefix}_herb_name`, label: '한약 처방명', kind: 'text', width: 'half' },
      {
        id: `${idPrefix}_herb_period`,
        label: '한약 기간(회/day × 일)',
        kind: 'text',
        width: 'half',
        placeholder: '예: 2회/day × 30일',
      },
      {
        id: `${idPrefix}_herb_compose`,
        label: '처방 구성',
        kind: 'textarea',
        width: 'full',
      },
      {
        id: `${idPrefix}_acu_types`,
        label: '침치료 종류',
        kind: 'checks',
        options: ['일반침', '전침', '약침'],
        width: 'half',
      },
      {
        id: `${idPrefix}_acu_pharma`,
        label: '약침 종류',
        kind: 'text',
        width: 'half',
      },
      {
        id: `${idPrefix}_acu_points`,
        label: '경혈 / 침치료 기간',
        kind: 'text',
        width: 'full',
        placeholder: '예: 관원·삼음교, 3회/주 × 4주',
      },
      {
        id: `${idPrefix}_moxa`,
        label: '뜸치료',
        kind: 'checks',
        options: ['일반뜸', '전자뜸'],
        width: 'half',
      },
      {
        id: `${idPrefix}_moxa_period`,
        label: '뜸 기간',
        kind: 'text',
        width: 'half',
        placeholder: '예: 3회/주 × 4주',
      },
      {
        id: `${idPrefix}_ir_area`,
        label: '적외선ㆍTDP 조사부위',
        kind: 'checks',
        options: IRRADIATION_AREA,
        width: 'full',
      },
      {
        id: `${idPrefix}_ir_time`,
        label: '적외선 시간/기간',
        kind: 'text',
        width: 'full',
        placeholder: '예: 15분, 3회/주 × 4주',
      },
      { id: `${idPrefix}_etc_name`, label: '기타 치료명', kind: 'text', width: 'half' },
      {
        id: `${idPrefix}_etc_period`,
        label: '기타 치료 기간',
        kind: 'text',
        width: 'half',
      },
    ],
  }
}

/** 순응도 블록 (주기 경과기록지) */
export function complianceSection(idPrefix: string): Section {
  return {
    id: `${idPrefix}_compliance`,
    title: '순응도',
    fields: [
      {
        id: `${idPrefix}_med_prescribed`,
        label: '복약 조제(팩)',
        kind: 'number',
        unit: '팩',
        width: 'quarter',
      },
      {
        id: `${idPrefix}_med_taken`,
        label: '복약 복용(팩)',
        kind: 'number',
        unit: '팩',
        width: 'quarter',
      },
      {
        id: `${idPrefix}_acu_planned`,
        label: '침구 계획(회)',
        kind: 'number',
        unit: '회',
        width: 'quarter',
      },
      {
        id: `${idPrefix}_acu_done`,
        label: '침구 시행(회)',
        kind: 'number',
        unit: '회',
        width: 'quarter',
        note: '순응도(%) = 시행/계획 × 100 (자동계산)',
      },
    ],
  }
}
