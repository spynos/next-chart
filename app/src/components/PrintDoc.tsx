// 진료기록부 진본 출력 서식 (부록 B 구성).
// 의료법 필수기재(인적사항/진료일시/진단/치료내용/작성의료인 서명란) 포함.
import type { FormSchema } from '@/forms/schema'
import type { Chart, Patient } from '@/lib/types'
import { age, fmtDateTime, maskRrn } from '@/lib/format'
import { displayValue } from '@/lib/format'
import { computeCompliance } from '@/forms'

interface Props {
  schema: FormSchema
  data: Record<string, unknown>
  chart: Chart
  patient: Patient
  orgName: string
  docHash?: string
  printedAt?: string
}

export function PrintDoc({
  schema,
  data,
  chart,
  patient,
  orgName,
  docHash,
  printedAt,
}: Props) {
  const compliance = computeCompliance(data)
  const cycleLabel = chart.cycle ? ` (${chart.cycle}주기)` : ''

  return (
    <div className="doc-sheet print-doc">
      <div className="doc-title">{orgName || '○○한의원'}</div>
      <div className="doc-sub">
        {schema.title}
        {cycleLabel} — 진료기록부
      </div>

      {/* 인적사항 (부록 A 가) + 진료일시 (바) */}
      <div className="doc-header-grid">
        <div className="cell">성명: {patient.name}</div>
        <div className="cell">
          등록번호: {patient.chartNo}
          {patient.rrn ? ` / 주민번호: ${maskRrn(patient.rrn)}` : ''}
        </div>
        <div className="cell">
          생년월일: {patient.birthDate} {patient.birthDate && `(${age(patient.birthDate)})`}
        </div>
        <div className="cell">성별: {patient.sex === 'female' ? '여' : '남'}</div>
        <div className="cell">연락처: {patient.phone ?? ''}</div>
        <div className="cell">작성 의료인: {chart.authorName}</div>
      </div>

      {schema.sections.map((section) => {
        const rendered = section.fields
          .filter((f) => f.kind !== 'heading')
          .map((f) => ({ f, text: displayValue(f, data[f.id]) }))
          .filter((x) => x.text !== '')
        if (rendered.length === 0) return null
        return (
          <div className="doc-section" key={section.id}>
            <h4>{section.title}</h4>
            {rendered.map(({ f, text }) => (
              <div className="doc-field" key={f.id}>
                <span className="k">{f.label}</span>
                <span className="v">{text}</span>
              </div>
            ))}
            {section.id.endsWith('compliance') && (compliance.med != null || compliance.acu != null) && (
              <div className="doc-field">
                <span className="k">순응도(자동계산)</span>
                <span className="v">
                  {compliance.med != null ? `복약 ${compliance.med}% ` : ''}
                  {compliance.acu != null ? `침구 ${compliance.acu}%` : ''}
                </span>
              </div>
            )}
          </div>
        )
      })}

      {/* 작성 의료인 서명란 (부록 A 공통) */}
      <div className="doc-sign">
        <div>
          진료일시:{' '}
          {fmtDateTime(
            (data['visit_date'] as string) ||
              (data['record_date'] as string) ||
              (data['result_date'] as string) ||
              chart.createdAt,
          )}
        </div>
        <div className="line">작성 의료인: {chart.authorName} (자필서명)</div>
      </div>

      <div className="doc-foot">
        ※ 공식 진료기록부는 본 출력물에 자필서명한 종이입니다. 출력 즉시 서명하여 보존하십시오. (10년)
        <br />
        출력일시: {printedAt ? fmtDateTime(printedAt) : '(미출력)'} / 문서해시:{' '}
        {docHash ?? '(출력 시 생성)'}
      </div>
    </div>
  )
}
