// 차트 편집 — 스키마 폼 입력, 저장, 필수기재 검증, 출력 이동.
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getChart, getPatient, saveChart } from '@/lib/repo'
import { audit } from '@/lib/audit'
import { getSchema, validateForPrint, computeCompliance } from '@/forms'
import { FormRenderer } from '@/components/FormRenderer'
import type { Chart, Patient } from '@/lib/types'
import { fmtDateTime } from '@/lib/format'

export function ChartEditor() {
  const { chartId } = useParams<{ chartId: string }>()
  const navigate = useNavigate()
  const [chart, setChart] = useState<Chart | null>(null)
  const [patient, setPatient] = useState<Patient | null>(null)
  const [data, setData] = useState<Record<string, unknown>>({})
  const [dirty, setDirty] = useState(false)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      if (!chartId) return
      const c = await getChart(chartId)
      if (!c) {
        setLoading(false)
        return
      }
      setChart(c)
      setData(c.data)
      setPatient((await getPatient(c.patientId)) ?? null)
      await audit('chart_view', { targetType: 'chart', targetId: c.id })
      setLoading(false)
    })()
  }, [chartId])

  const schema = useMemo(() => (chart ? getSchema(chart.type) : null), [chart])

  const issues = useMemo(() => {
    if (!schema || !chart || !patient) return []
    return validateForPrint(schema, { ...chart, data }, patient)
  }, [schema, chart, patient, data])
  const errors = issues.filter((i) => i.level === 'error')

  const compliance = computeCompliance(data)

  if (loading) return <div className="panel muted">불러오는 중…</div>
  if (!chart || !schema || !patient)
    return <div className="panel">차트를 찾을 수 없습니다.</div>

  const onChange = (id: string, value: unknown) => {
    setData((d) => ({ ...d, [id]: value }))
    setDirty(true)
  }

  const doSave = async (status?: Chart['status']) => {
    const updated = await saveChart({
      ...chart,
      data,
      status: status ?? chart.status,
    })
    setChart(updated)
    setDirty(false)
    setSavedAt(updated.updatedAt)
  }

  const goPrint = async () => {
    if (errors.length > 0) {
      alert('필수기재 항목이 누락되어 출력할 수 없습니다.\n\n' + errors.map((e) => `· ${e.message}`).join('\n'))
      return
    }
    await doSave()
    navigate(`/charts/${chart.id}/print`)
  }

  return (
    <div>
      <div className="panel">
        <div className="row">
          <button className="no-print" onClick={() => navigate(`/patients/${patient.id}`)}>
            ← 환자
          </button>
          <h2 style={{ margin: 0 }}>
            {patient.name} · {schema.title}
            {chart.cycle ? ` ${chart.cycle}주기` : ''}
          </h2>
          <span className="spacer" />
          {dirty ? (
            <span className="muted">● 저장 안 됨</span>
          ) : savedAt ? (
            <span className="muted">저장됨 {fmtDateTime(savedAt)}</span>
          ) : null}
          <button onClick={() => doSave()} disabled={!dirty}>
            저장
          </button>
          <button className="primary" onClick={goPrint}>
            출력(진본화) →
          </button>
        </div>
        {(compliance.med != null || compliance.acu != null) && (
          <p className="muted" style={{ marginTop: 8 }}>
            자동계산 순응도 —
            {compliance.med != null ? ` 복약 ${compliance.med}%` : ''}
            {compliance.acu != null ? ` 침구 ${compliance.acu}%` : ''}
          </p>
        )}
      </div>

      {issues.length > 0 && (
        <div className="panel">
          <h3>출력 전 점검 (의료법 필수기재 · 부록 A)</h3>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {issues.map((i, idx) => (
              <li key={idx} className={i.level === 'error' ? 'issue-error' : 'issue-warn'}>
                {i.level === 'error' ? '✕' : '⚠'} {i.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="panel">
        <FormRenderer schema={schema} data={data} onChange={onChange} />
      </div>
    </div>
  )
}
