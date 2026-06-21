// 대시보드 — 빠른 통계, 최근 출력본, 운영 원칙 안내.
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listPatients, listRecentPrintouts, getPatient } from '@/lib/repo'
import type { Printout } from '@/lib/types'
import { fmtDateTime } from '@/lib/format'

interface RecentRow extends Printout {
  patientName: string
}

export function Dashboard() {
  const navigate = useNavigate()
  const [patientCount, setPatientCount] = useState(0)
  const [recent, setRecent] = useState<RecentRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      const patients = await listPatients()
      setPatientCount(patients.length)
      const printouts = await listRecentPrintouts(10)
      const rows: RecentRow[] = []
      for (const p of printouts) {
        const pat = await getPatient(p.patientId)
        rows.push({ ...p, patientName: pat?.name ?? '(알 수 없음)' })
      }
      setRecent(rows)
      setLoading(false)
    })()
  }, [])

  return (
    <div>
      <div className="panel">
        <h2>대시보드</h2>
        <div className="row">
          <Stat label="등록 환자" value={loading ? '…' : String(patientCount)} />
          <Stat label="최근 출력본" value={loading ? '…' : String(recent.length)} />
        </div>
      </div>

      <div className="panel">
        <h3>🖨 최근 출력본</h3>
        {loading ? (
          <p className="muted">불러오는 중…</p>
        ) : recent.length === 0 ? (
          <p className="muted">출력 이력이 없습니다.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>환자</th>
                <th>출력일시</th>
                <th>방식</th>
                <th>문서해시</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {recent.map((p) => (
                <tr key={p.id}>
                  <td>{p.patientName}</td>
                  <td>{fmtDateTime(p.printedAt)}</td>
                  <td>
                    <span className="badge printed">
                      {p.outputType === 'pdf' ? 'PDF 저장' : '즉시 출력'}
                    </span>
                    {p.amendmentOf ? <span className="badge amended" style={{ marginLeft: 4 }}>정정본</span> : null}
                  </td>
                  <td><code>{p.docHash.slice(0, 16)}…</code></td>
                  <td>
                    <button onClick={() => navigate(`/charts/${p.chartId}/print`)}>열기 →</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="panel">
        <h3>운영 원칙</h3>
        <ul style={{ lineHeight: 1.9 }}>
          <li>공식 진료기록부는 <b>출력·자필서명한 종이</b>입니다. 화면·DB는 보조 자료입니다.</li>
          <li>진료 직후 <b>지체 없이</b> 출력하여 자필서명하고 진료기록부철에 편철·보존합니다(10년).</li>
          <li>정정 시 원본 종이는 폐기하지 않고, 정정본을 별도 출력·서명하여 함께 보존합니다.</li>
          <li>개인 계정만 사용하고 공유하지 않습니다. 자리를 비울 때는 잠금(로그아웃)합니다.</li>
        </ul>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel" style={{ flex: 1, margin: 0, textAlign: 'center' }}>
      <div className="muted">{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700 }}>{value}</div>
    </div>
  )
}
