// (여성) 주기당 경과기록지 — ver4.0 PDF 7~14p 디지털화
// 1주기 분량의 스키마. cycle 번호는 Chart.cycle 로 관리(1~4 반복).
import {
  PATTERN_FEMALE,
  SCALE_OPTIONS,
  YESNO,
  complianceSection,
  treatmentSection,
  type FormSchema,
} from './schema'

export const femaleCycle: FormSchema = {
  type: 'cycle_female',
  title: '(여성) 주기당 경과기록지',
  sections: [
    {
      id: 'cycle_meta',
      title: '경과 기본정보',
      fields: [
        { id: 'record_date', label: '작성일', kind: 'date', width: 'half', required: true },
        {
          id: 'cycle_summary',
          label: '이 주기 요약',
          kind: 'textarea',
          width: 'full',
          placeholder: '하나의 월경주기 동안의 치료 과정 변화 요약',
        },
      ],
    },
    {
      id: 'menses',
      title: '월경력',
      fields: [
        { id: 'lmp', label: '최종월경일(LMP)', kind: 'date', width: 'third' },
        { id: 'cycle_days', label: '주기', kind: 'number', unit: '일', width: 'third' },
        { id: 'menses_days', label: '월경기간', kind: 'number', unit: '일', width: 'third' },
        { id: 'flow_pads', label: '월경량(패드 총 사용량)', kind: 'number', unit: '개', width: 'half' },
        {
          id: 'flow_pad_type',
          label: '패드 종류',
          kind: 'checks',
          options: ['오버나이트', '대형', '중형'],
          width: 'half',
        },
        { id: 'pain_duration', label: '통증기간', kind: 'number', unit: '시간', width: 'third' },
        { id: 'pain_intensity', label: '통증강도', kind: 'number', unit: '/10', width: 'third' },
        { id: 'painkiller', label: '진통제 복용', kind: 'number', unit: '정', width: 'third' },
      ],
    },
    {
      id: 'ovulation_signs',
      title: '배란징후 · 이상반응',
      fields: [
        { id: 'cervical_mucus', label: '경관점액 변화', kind: 'radio', options: YESNO, width: 'third' },
        { id: 'breast_change', label: '유방변화', kind: 'radio', options: YESNO, width: 'third' },
        { id: 'abdominal_bloating', label: '복부팽만감', kind: 'radio', options: YESNO, width: 'third' },
        { id: 'adverse', label: '이상반응', kind: 'radio', options: YESNO, width: 'third' },
        {
          id: 'adverse_type',
          label: '이상반응 종류',
          kind: 'checks',
          options: ['소화기계', '신경계통', '피부계통'],
          allowOther: true,
          width: 'full',
        },
        {
          id: 'intercourse_freq',
          label: '부부생활 횟수',
          kind: 'text',
          placeholder: '평균 ○회/월 (배란 전/당일/후)',
          width: 'full',
        },
      ],
    },
    complianceSection('cyc'),
    {
      id: 'pattern',
      title: '변증',
      fields: [
        {
          id: 'pattern',
          label: '변증(여성)',
          kind: 'checks',
          options: PATTERN_FEMALE,
          allowOther: true,
          required: true,
          width: 'full',
        },
        { id: 'note', label: '기타 경과 메모', kind: 'textarea', width: 'full' },
        { id: 'sx_overall', label: '전반적 컨디션', kind: 'scale', options: SCALE_OPTIONS, width: 'half' },
      ],
    },
    treatmentSection('cyc'),
  ],
}
