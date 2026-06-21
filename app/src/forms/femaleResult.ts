// 난임 치료 결과지 (여성) — ver4.0 PDF 15~16p 디지털화
import { PATTERN_FEMALE, YESNO, type FormSchema } from './schema'

export const femaleResult: FormSchema = {
  type: 'result_female',
  title: '난임 치료 결과지',
  sections: [
    {
      id: 'result',
      title: '치료 결과',
      fields: [
        { id: 'result_date', label: '작성일자', kind: 'date', width: 'half', required: true },
        {
          id: 'cycles_total',
          label: '총 참여주기수',
          kind: 'radio',
          options: ['치료 1주기', '치료 2주기', '치료 3주기', '치료 4주기'],
          allowOther: true,
          width: 'full',
        },
        {
          id: 'final_pattern',
          label: '최종 치료시 한의병증',
          kind: 'checks',
          options: PATTERN_FEMALE,
          allowOther: true,
          width: 'full',
        },
        { id: 'final_herb', label: '치료시 사용된 처방명', kind: 'text', width: 'full' },
        { id: 'final_med_compliance', label: '최종 복약 순응도', kind: 'number', unit: '%', width: 'half' },
        { id: 'final_acu_compliance', label: '최종 침구치료 순응도', kind: 'number', unit: '%', width: 'half' },
      ],
    },
    {
      id: 'pregnancy',
      title: '임신 여부',
      fields: [
        {
          id: 'pregnant',
          label: '임신여부',
          kind: 'radio',
          options: ['예', '아니오'],
          required: true,
          width: 'half',
        },
        { id: 'pregnant_weeks', label: '확인된 임신주수', kind: 'number', unit: '주', width: 'half' },
        {
          id: 'pregnancy_timing',
          label: '임신시기',
          kind: 'radio',
          options: ['치료 중', '치료 후'],
          allowOther: true,
          width: 'half',
        },
        {
          id: 'pregnancy_cycle',
          label: '치료 몇 주기에 확인',
          kind: 'text',
          placeholder: '치료 ○주기 / 종료 후 ○일',
          width: 'half',
        },
        { id: 'spouse_treated', label: '배우자 치료 여부', kind: 'radio', options: YESNO, width: 'half' },
        { id: 'org_name', label: '시술기관명', kind: 'text', width: 'half' },
      ],
    },
    {
      id: 'final_outcome',
      title: '임신 최종결과',
      fields: [
        {
          id: 'delivery_type',
          label: '분만형태',
          kind: 'checks',
          options: ['만삭분만', '조산분만', '자연분만', '제왕절개', '사산', '유산'],
          allowOther: true,
          width: 'full',
        },
        {
          id: 'fetus_count',
          label: '태아 수',
          kind: 'radio',
          options: ['단태아', '다태아'],
          allowOther: true,
          width: 'half',
        },
        { id: 'outcome_weeks', label: '분만/사산/유산 시점(임신주차)', kind: 'text', width: 'half' },
        {
          id: 'outcome_note',
          label: '비고',
          kind: 'textarea',
          width: 'full',
          note: '※ 임신 20주 이전 중단=유산. 산부인과 임신확인서 첨부 권장.',
        },
      ],
    },
  ],
}
