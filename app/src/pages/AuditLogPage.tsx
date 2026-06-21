// 감사로그 조회 + 무결성(해시체인) 검증 + 별도 매체 내보내기 (FR-07, NFR-04/05)
import { useEffect, useState } from 'react'
import { readAuditLog, type DecodedAudit } from '@/lib/audit'
import { exportAuditLog, downloadJson } from '@/lib/backup'
import { fmtDateTime } from '@/lib/format'

const ACTION_LABEL: Record<string, string> = {
  login: '로그인',
  logout: '로그아웃',
  login_failed: '로그인 실패',
  patient_create: '환자 등록',
  patient_update: '환자 수정',
  patient_view: '환자 조회',
  chart_create: '차트 생성',
  chart_update: '차트 저장',
  chart_view: '차트 조회',
  print: '출력',
  amend: '정정',
  user_create: '계정 생성',
  user_disable: '계정 말소',
  backup_export: '백업 내보내기',
  audit_export: '감사로그 내보내기',
  restore: '복구',
}

export function AuditLogPage() {
  const [entries, setEntries] = useState<DecodedAudit[]>([])
  const [loading, setLoading] = useState(true)

  const reload = async () => {
    setLoading(true)
    setEntries((await readAuditLog()).reverse())
    setLoading(false)
  }
  useEffect(() => {
    void reload()
  }, [])

  const chainIntact = entries.every((e) => e.chainValid)

  const onExport = async () => {
    const data = await exportAuditLog()
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '')
    downloadJson(`audit-${stamp}.json`, data)
    await reload()
    alert('감사로그를 내보냈습니다. 별도 물리 매체에 보관하세요. (2년 이상 보존 · NFR-05)')
  }

  return (
    <div>
      <div className="panel">
        <div className="row">
          <h2 style={{ margin: 0 }}>감사로그</h2>
          <span className="spacer" />
          <span className={chainIntact ? 'chain-ok' : 'chain-bad'}>
            {loading ? '' : chainIntact ? '✔ 해시체인 무결성 정상' : '⚠ 무결성 손상 감지!'}
          </span>
          <button onClick={onExport}>별도 매체 내보내기</button>
          <button onClick={() => void reload()}>새로고침</button>
        </div>
        <p className="muted" style={{ marginTop: 6 }}>
          append-only · 직전 레코드 해시를 포함하는 체인으로 위·변조를 탐지합니다. 민감 상세는 암호화 저장됩니다.
        </p>
      </div>

      <div className="panel">
        {loading ? (
          <p className="muted">불러오는 중…</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>일시</th>
                <th>행위</th>
                <th>사용자</th>
                <th>상세</th>
                <th>체인</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.seq}>
                  <td>{e.seq}</td>
                  <td>{fmtDateTime(e.at)}</td>
                  <td>{ACTION_LABEL[e.action] ?? e.action}</td>
                  <td>{e.actorName}</td>
                  <td className="muted">{e.detail}</td>
                  <td>
                    {e.chainValid ? (
                      <span className="chain-ok">✔</span>
                    ) : (
                      <span className="chain-bad">✕ 변조</span>
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
