// 백업/복구 + 기관 설정 (FR-08, NFR-07)
import { useEffect, useRef, useState } from 'react'
import { exportBackup, restoreBackup, downloadJson, type BackupFile } from '@/lib/backup'
import { getSettings, saveSettings } from '@/lib/settings'
import { UpdatePanel } from '@/components/UpdatePanel'

export function BackupPage() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [orgName, setOrgName] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void (async () => setOrgName((await getSettings()).orgName))()
  }, [])

  const onBackup = async () => {
    setBusy(true)
    try {
      const data = await exportBackup()
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '')
      downloadJson(`nextchart-backup-${stamp}.json`, data)
      setMsg('백업 파일을 내보냈습니다. 백업본은 암호화 상태이며, 같은 비밀번호로만 복호화됩니다.')
    } finally {
      setBusy(false)
    }
  }

  const onRestoreFile = async (file: File) => {
    if (!confirm('현재 데이터 위에 백업을 복구합니다. 계속할까요?')) return
    setBusy(true)
    try {
      const text = await file.text()
      const parsed = JSON.parse(text) as BackupFile
      await restoreBackup(parsed)
      setMsg('복구가 완료되었습니다. 변경 사항을 반영하려면 새로고침하세요.')
    } catch (e) {
      setMsg('복구 실패: ' + (e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const onSaveOrg = async () => {
    await saveSettings({ orgName: orgName.trim() })
    setMsg('기관명을 저장했습니다.')
  }

  return (
    <div>
      <div className="panel">
        <h2>백업 / 복구</h2>
        <p className="muted">
          완전 로컬 저장(외부 전송 없음). 백업본의 진료 데이터는 DEK로 암호화된 상태로 내보내집니다(NFR-07).
          정기적으로 의료기관 내부 매체에 백업하세요.
        </p>
        <div className="row" style={{ marginTop: 8 }}>
          <button className="primary" onClick={onBackup} disabled={busy}>
            ⬇ 전체 백업 내보내기
          </button>
          <button onClick={() => fileRef.current?.click()} disabled={busy}>
            ⬆ 백업에서 복구
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void onRestoreFile(f)
              e.target.value = ''
            }}
          />
        </div>
        {msg && <p style={{ marginTop: 10 }}>{msg}</p>}
      </div>

      <UpdatePanel />

      <div className="panel">
        <h3>기관 설정</h3>
        <div className="row">
          <div className="field" style={{ flex: 1 }}>
            <span className="field-label">의료기관명 (출력 서식 머리글)</span>
            <input value={orgName} onChange={(e) => setOrgName(e.target.value)} />
          </div>
          <button onClick={onSaveOrg}>저장</button>
        </div>
      </div>
    </div>
  )
}
