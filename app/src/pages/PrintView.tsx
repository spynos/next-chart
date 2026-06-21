// 출력(진본화) — 서식 미리보기, 출력본 스냅샷(해시) 생성.
// 두 가지 출력 경로: ① PDF 저장(파일 다운로드) ② 즉시 출력(프린터 연결).
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  createPrintout,
  getChart,
  getPatient,
  listPrintoutsByChart,
  saveChart,
} from '@/lib/repo'
import { getSchema, validateForPrint } from '@/forms'
import { getSettings } from '@/lib/settings'
import { saveElementAsPdf } from '@/lib/pdf'
import { PrintDoc } from '@/components/PrintDoc'
import type { Chart, OutputType, Patient, Printout } from '@/lib/types'
import { fmtDateTime } from '@/lib/format'

export function PrintView() {
  const { chartId } = useParams<{ chartId: string }>()
  const navigate = useNavigate()
  const docRef = useRef<HTMLDivElement>(null)
  const [chart, setChart] = useState<Chart | null>(null)
  const [patient, setPatient] = useState<Patient | null>(null)
  const [orgName, setOrgName] = useState('')
  const [printouts, setPrintouts] = useState<Printout[]>([])
  const [current, setCurrent] = useState<Printout | null>(null)
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)

  const reload = async () => {
    if (!chartId) return
    const c = await getChart(chartId)
    if (!c) {
      setLoading(false)
      return
    }
    setChart(c)
    setPatient((await getPatient(c.patientId)) ?? null)
    setOrgName((await getSettings()).orgName)
    setPrintouts(await listPrintoutsByChart(c.id))
    setLoading(false)
  }
  useEffect(() => {
    void reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartId])

  if (loading) return <div className="panel muted">불러오는 중…</div>
  if (!chart || !patient) return <div className="panel">차트를 찾을 수 없습니다.</div>
  const schema = getSchema(chart.type)
  const issues = validateForPrint(schema, chart, patient)
  const errors = issues.filter((i) => i.level === 'error')

  const hasPrior = printouts.length > 0 // 이전 출력본 존재 → 재출력은 정정본

  // 출력본 스냅샷 생성 후 PDF 저장 또는 즉시 출력
  const output = async (type: OutputType) => {
    if (errors.length > 0) return
    setBusy(true)
    try {
      const amend = hasPrior
      const printout = await createPrintout({
        chart,
        outputType: type,
        amendmentOf: amend ? printouts.slice(-1)[0]?.id : undefined,
      })
      await saveChart({ ...chart, status: amend ? 'amended' : 'printed' })
      setCurrent(printout)
      await reload()
      // 스냅샷이 서식에 반영되도록 한 틱 대기
      await new Promise((r) => setTimeout(r, 250))
      if (type === 'print') {
        window.print()
      } else {
        const safeName = `${patient.name}_${schema.title}${chart.cycle ? `_${chart.cycle}주기` : ''}_${printout.docHash.slice(0, 8)}.pdf`
        if (docRef.current) await saveElementAsPdf(docRef.current, safeName)
      }
    } catch (e) {
      alert('출력 처리 중 오류: ' + (e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <div className="panel no-print">
        <div className="row">
          <button onClick={() => navigate(`/charts/${chart.id}`)}>← 편집으로</button>
          <h2 style={{ margin: 0 }}>출력 (진본화)</h2>
          <span className="spacer" />
          <button className="primary" onClick={() => output('pdf')} disabled={busy || errors.length > 0}>
            📄 PDF 저장{hasPrior ? ' (정정본)' : ''}
          </button>
          <button className="primary" onClick={() => output('print')} disabled={busy || errors.length > 0}>
            🖨 즉시 출력 (프린터){hasPrior ? ' (정정본)' : ''}
          </button>
        </div>
        <p className="muted" style={{ marginTop: 8 }}>
          <b>PDF 저장</b>은 서식을 PDF 파일로 내려받습니다. <b>즉시 출력</b>은 연결된 프린터로 바로 인쇄합니다.
          어느 방식이든 출력 시 문서 스냅샷·해시가 기록됩니다. 종이 출력물에는 직접 자필서명하여 보존하십시오.
        </p>
        {errors.length > 0 && (
          <p className="error-text">
            ✕ 필수기재 누락으로 출력 불가: {errors.map((e) => e.message).join(' / ')}
          </p>
        )}
        {hasPrior && (
          <p className="issue-warn" style={{ marginTop: 8 }}>
            ⚠ 이미 출력된 이력이 있습니다. 내용 변경 시 <b>원본 출력물을 폐기하지 말고</b> 정정본을 별도
            출력하여 원본과 함께 보존하세요. (AR-04 · §6.3)
          </p>
        )}
      </div>

      {/* 출력 이력 */}
      {printouts.length > 0 && (
        <div className="panel no-print">
          <h3>출력 이력</h3>
          <table>
            <thead>
              <tr>
                <th>출력일시</th>
                <th>방식</th>
                <th>출력자</th>
                <th>문서해시</th>
                <th>구분</th>
              </tr>
            </thead>
            <tbody>
              {printouts.map((p) => (
                <tr key={p.id}>
                  <td>{fmtDateTime(p.printedAt)}</td>
                  <td>{p.outputType === 'pdf' ? 'PDF 저장' : '즉시 출력'}</td>
                  <td>{p.printedByName}</td>
                  <td><code>{p.docHash.slice(0, 16)}…</code></td>
                  <td>{p.amendmentOf ? <span className="badge amended">정정본</span> : <span className="badge printed">원본</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 서식 미리보기 / 출력 대상 */}
      <div className="panel">
        <div ref={docRef}>
          <PrintDoc
            schema={schema}
            data={current ? current.snapshot : chart.data}
            chart={chart}
            patient={patient}
            orgName={orgName}
            docHash={current?.docHash}
            printedAt={current?.printedAt}
          />
        </div>
      </div>
    </div>
  )
}
