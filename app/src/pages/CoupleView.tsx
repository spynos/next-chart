// 부부 통합 보기 — 연결된 두 환자의 차트를 한 화면에서 함께 본다(난임=부부 단위 치료).
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getPatient, listChartsByPatient } from '@/lib/repo'
import { getSchema } from '@/forms'
import type { Chart, Patient } from '@/lib/types'
import { age, fmtDateTime } from '@/lib/format'

interface Side {
  patient: Patient
  charts: Chart[]
}

export function CoupleView() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [female, setFemale] = useState<Side | null>(null)
  const [male, setMale] = useState<Side | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    void (async () => {
      if (!id) return
      setLoading(true)
      const a = await getPatient(id)
      if (!a) {
        setError('환자를 찾을 수 없습니다.')
        setLoading(false)
        return
      }
      if (!a.spouseId) {
        setError('연결된 배우자가 없습니다.')
        setLoading(false)
        return
      }
      const b = await getPatient(a.spouseId)
      if (!b) {
        setError('배우자 정보를 찾을 수 없습니다.')
        setLoading(false)
        return
      }
      const sideA: Side = { patient: a, charts: await listChartsByPatient(a.id) }
      const sideB: Side = { patient: b, charts: await listChartsByPatient(b.id) }
      // 여성 왼쪽 · 남성 오른쪽. (동성 등 예외는 a 왼쪽 · b 오른쪽)
      const [left, right] = a.sex === 'male' ? [sideB, sideA] : [sideA, sideB]
      setFemale(left)
      setMale(right)
      setLoading(false)
    })()
  }, [id])

  if (loading) return <div className="panel muted">불러오는 중…</div>
  if (error) return <div className="panel">{error}</div>

  return (
    <div>
      <div className="panel">
        <div className="row">
          <button onClick={() => navigate(-1)}>← 뒤로</button>
          <h2 style={{ margin: 0 }}>👫 부부 통합 보기</h2>
          <span className="spacer" />
        </div>
      </div>

      <div className="row" style={{ alignItems: 'flex-start' }}>
        <CoupleColumn side={female} onOpen={(cid) => navigate(`/charts/${cid}`)} onOpenPatient={(pid) => navigate(`/patients/${pid}`)} />
        <CoupleColumn side={male} onOpen={(cid) => navigate(`/charts/${cid}`)} onOpenPatient={(pid) => navigate(`/patients/${pid}`)} />
      </div>
    </div>
  )
}

function CoupleColumn({
  side,
  onOpen,
  onOpenPatient,
}: {
  side: Side | null
  onOpen: (chartId: string) => void
  onOpenPatient: (id: string) => void
}) {
  if (!side) return <div className="panel" style={{ flex: 1 }} />
  const { patient, charts } = side
  return (
    <div className="panel" style={{ flex: 1, minWidth: 320 }}>
      <div className="row">
        <h3 style={{ margin: 0 }}>
          {patient.name}{' '}
          <span className="muted">({patient.sex === 'female' ? '여' : '남'})</span>
        </h3>
        <span className="spacer" />
        <button onClick={() => onOpenPatient(patient.id)}>상세</button>
      </div>
      <p className="muted" style={{ marginTop: 4 }}>
        등록번호 {patient.chartNo} · {patient.birthDate} {patient.birthDate && `(${age(patient.birthDate)})`}
      </p>
      {charts.length === 0 ? (
        <p className="muted">차트가 없습니다.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>차트</th>
              <th>수정</th>
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
                <td>{fmtDateTime(c.updatedAt)}</td>
                <td>
                  <button onClick={() => onOpen(c.id)}>열기</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
