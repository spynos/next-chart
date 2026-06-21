// (남성) 주기당 경과기록지 — ver4.0 PDF 7~14p 디지털화
import {
  GOOD_LOW_NONE,
  PATTERN_MALE,
  YESNO,
  complianceSection,
  treatmentSection,
  type FormSchema,
} from './schema'

export const maleCycle: FormSchema = {
  type: 'cycle_male',
  title: '(남성) 주기당 경과기록지',
  sections: [
    {
      id: 'cycle_meta',
      title: '경과 기본정보',
      fields: [
        { id: 'record_date', label: '작성일', kind: 'date', width: 'half', required: true },
      ],
    },
    {
      id: 'sexual',
      title: '성기능 평가',
      fields: [
        { id: 'libido', label: '성욕', kind: 'radio', options: GOOD_LOW_NONE, width: 'third' },
        { id: 'erection', label: '발기력', kind: 'radio', options: GOOD_LOW_NONE, width: 'third' },
        {
          id: 'ejaculation',
          label: '사정',
          kind: 'radio',
          options: ['양호', '지연', '조루', '통증'],
          allowOther: true,
          width: 'third',
        },
        {
          id: 'intercourse_freq',
          label: '부부생활 횟수',
          kind: 'text',
          placeholder: '평균 ○회/월 (배란 전/당일/후)',
          width: 'full',
        },
        { id: 'adverse', label: '이상반응', kind: 'radio', options: YESNO, width: 'third' },
        {
          id: 'adverse_type',
          label: '이상반응 종류',
          kind: 'checks',
          options: ['소화기계', '신경계통', '피부계통'],
          allowOther: true,
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
          label: '변증(남성)',
          kind: 'checks',
          options: PATTERN_MALE,
          allowOther: true,
          required: true,
          width: 'full',
        },
        { id: 'note', label: '기타 경과 메모', kind: 'textarea', width: 'full' },
      ],
    },
    treatmentSection('cyc'),
  ],
}
