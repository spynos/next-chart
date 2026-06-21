// 환자 상세 — 인적사항, 차트 목록, 새 차트 생성, 출력본 이력.
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  createChart,
  getPatient,
  linkSpouse,
  listChartsByPatient,
  listPatients,
  listPrintoutsByPatient,
  unlinkSpouse,
} from '@/lib/repo'
import { CHART_TYPE_OPTIONS, getSchema } from '@/forms'
import type { Chart, Patient, Printout } from '@/lib/types'
import type { ChartType } from '@/lib/types'
import { age, fmtDateTime, maskRrn } from '@/lib/format'

export function PatientDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [patient, setPatient] = useState<Patient | null>(null)
  const [charts, setCharts] = useState<Chart[]>([])
  const [printouts, setPrintouts] = useState<Printout[]>([])
  const [spouse, setSpouse] = useState<Patient | null>(null)
  const [loading, setLoading] = useState(true)

  const reload = async () => {
    if (!id) return
    setLoading(true)
    const p = await getPatient(id)
    setPatient(p ?? null)
    setSpouse(p?.spouseId ? (await getPatient(p.spouseId)) ?? null : null)
    setCharts(await listChartsByPatient(id))
    setPrintouts(await listPrintoutsByPatient(id))
    setLoading(false)
  }
  useEffect(() => {
    void reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (loading) return <div className="panel muted">불러오는 중…</div>
  if (!patient) return <div className="panel">환자를 찾을 수 없습니다.</div>

  const availableTypes = CHART_TYPE_OPTIONS.filter((o) => o.sex === patient.sex)

  const onCreate = async (type: ChartType) => {
    const opt = CHART_TYPE_OPTIONS.find((o) => o.type === type)!
    let cycle: number | undefined
    let title = opt.label
    if (opt.cycle) {
      const existing = charts.filter((c) => c.type === type)
      cycle = existing.length + 1
      title = `${opt.label} ${cycle}주기`
    }
    const chart = await createChart({ patientId: patient.id, type, cycle, title })
    navigate(`/charts/${chart.id}`)
  }

  return (
    <div>
      <div className="panel">
        <div className="row">
          <button className="no-print" onClick={() => navigate('/patients')}>
            ← 목록
          </button>
          <h2 style={{ margin: 0 }}>
            {patient.name} <span className="muted">({patient.sex === 'female' ? '여' : '남'})</span>
          </h2>
          <span className="spacer" />
        </div>
        <div className="form-grid" style={{ marginTop: 12 }}>
          <Info label="등록번호" value={patient.chartNo} />
          <Info label="생년월일" value={`${patient.birthDate} ${patient.birthDate ? `(${age(patient.birthDate)})` : ''}`} />
          <Info label="주민번호" value={maskRrn(patient.rrn)} />
          <Info label="연락처" value={patient.phone ?? ''} />
          <Info label="주소" value={patient.address ?? ''} />
          <Info label="직업" value={patient.job ?? ''} />
        </div>
      </div>

      <SpousePanel
        patient={patient}
        spouse={spouse}
        onChanged={reload}
        onOpenCouple={() => navigate(`/couple/${patient.id}`)}
        onOpenPatient={(pid) => navigate(`/patients/${pid}`)}
      />

      <div className="panel">
        <div className="row">
          <h3 style={{ margin: 0 }}>새 차트 작성</h3>
          <span className="spacer" />
          {availableTypes.map((o) => (
            <button key={o.type} className="primary" onClick={() => onCreate(o.type)}>
              + {o.label}
            </button>
          ))}
        </div>
      </div>

      <div className="panel">
        <h3>차트 목록</h3>
        {charts.length === 0 ? (
          <p className="muted">작성된 차트가 없습니다.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>차트</th>
                <th>작성자</th>
                <th>최종수정</th>
                <th>상태</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {charts.map((c) => (
                <tr key={c.id}>
                  <td>
                    {getSchema(c.type).title}
                    {c.cycle ? ` ${c.cycle}주기` : ''}
                  </td>
                  <td>{c.authorName}</td>
                  <td>{fmtDateTime(c.updatedAt)}</td>
                  <td>
                    <StatusBadge status={c.status} />
                  </td>
                  <td>
                    <button onClick={() => navigate(`/charts/${c.id}`)}>열기</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="panel">
        <h3>출력본 이력 (서명 추적)</h3>
        {printouts.length === 0 ? (
          <p className="muted">출력 이력이 없습니다.</p>
        ) : (
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
                  <td>
                    {p.amendmentOf ? (
                      <span className="badge amended">정정본</span>
                    ) : (
                      <span className="badge printed">원본</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="field third">
      <span className="field-label">{label}</span>
      <span>{value || <span className="muted">—</span>}</span>
    </div>
  )
}

function StatusBadge({ status }: { status: Chart['status'] }) {
  const label = status === 'draft' ? '작성중' : status === 'printed' ? '출력됨' : '정정됨'
  return <span className={`badge ${status}`}>{label}</span>
}

function SpousePanel({
  patient,
  spouse,
  onChanged,
  onOpenCouple,
  onOpenPatient,
}: {
  patient: Patient
  spouse: Patient | null
  onChanged: () => void | Promise<void>
  onOpenCouple: () => void
  onOpenPatient: (id: string) => void
}) {
  const [picking, setPicking] = useState(false)
  const [q, setQ] = useState('')
  const [candidates, setCandidates] = useState<Patient[]>([])

  const openPicker = async () => {
    setPicking(true)
    // 본인 제외, 이성(난임 부부) 우선 정렬
    const all = await listPatients()
    const list = all
      .filter((p) => p.id !== patient.id)
      .sort((a, b) => Number(b.sex !== patient.sex) - Number(a.sex !== patient.sex))
    setCandidates(list)
  }

  const filtered = candidates.filter((p) => {
    const t = q.trim().toLowerCase()
    if (!t) return true
    return p.name.toLowerCase().includes(t) || p.chartNo.toLowerCase().includes(t)
  })

  const doLink = async (partnerId: string) => {
    await linkSpouse(patient.id, partnerId)
    setPicking(false)
    setQ('')
    await onChanged()
  }

  const doUnlink = async () => {
    if (!confirm('부부 연결을 해제할까요?')) return
    await unlinkSpouse(patient.id)
    await onChanged()
  }

  return (
    <div className="panel">
      <div className="row">
        <h3 style={{ margin: 0 }}>👫 배우자 (부부 연결)</h3>
        <span className="spacer" />
        {spouse ? (
          <>
            <button className="primary" onClick={onOpenCouple}>
              부부 통합 보기 →
            </button>
            <button className="danger" onClick={doUnlink}>
              연결 해제
            </button>
          </>
        ) : picking ? (
          <button onClick={() => setPicking(false)}>닫기</button>
        ) : (
          <button className="primary" onClick={openPicker}>
            + 배우자 연결
          </button>
        )}
      </div>

      {spouse ? (
        <p style={{ marginTop: 10 }}>
          <b>{spouse.name}</b> ({spouse.sex === 'female' ? '여' : '남'}) · 등록번호 {spouse.chartNo}{' '}
          <button style={{ marginLeft: 8 }} onClick={() => onOpenPatient(spouse.id)}>
            배우자 차트 열기
          </button>
        </p>
      ) : picking ? (
        <div style={{ marginTop: 10 }}>
          <input
            placeholder="배우자로 연결할 환자 검색 (이름·등록번호)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ maxWidth: 320 }}
          />
          <table style={{ marginTop: 10 }}>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td className="muted">연결할 다른 환자가 없습니다.</td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p.id}>
                    <td>{p.chartNo}</td>
                    <td>{p.name}</td>
                    <td>{p.sex === 'female' ? '여' : '남'}</td>
                    <td>
                      {p.spouseId && p.spouseId !== patient.id && (
                        <span className="muted" style={{ marginRight: 8 }}>이미 연결됨(교체)</span>
                      )}
                      <button className="primary" onClick={() => doLink(p.id)}>
                        이 환자와 연결
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="muted" style={{ marginTop: 10 }}>
          연결된 배우자가 없습니다. 난임은 부부 단위 치료이므로 배우자를 연결하면 두 사람의 차트를 함께 볼 수 있습니다.
        </p>
      )}
    </div>
  )
}
