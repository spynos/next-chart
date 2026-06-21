// 업데이트 확인/적용 패널 (사용자 확인형). 데스크톱에서만 활성.
import { useEffect, useState } from 'react'
import { checkForUpdate, getAppVersion, isTauri, type AvailableUpdate } from '@/lib/updater'
import { audit } from '@/lib/audit'

export function UpdatePanel() {
  const [version, setVersion] = useState('')
  const [status, setStatus] = useState('')
  const [update, setUpdate] = useState<AvailableUpdate | null>(null)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<number | null>(null)
  const desktop = isTauri()

  useEffect(() => {
    void getAppVersion().then(setVersion)
  }, [])

  const onCheck = async () => {
    setBusy(true)
    setStatus('확인 중…')
    setUpdate(null)
    try {
      const up = await checkForUpdate()
      if (!up) {
        setStatus('최신 버전입니다.')
      } else {
        setUpdate(up)
        setStatus(`새 버전 ${up.version} 사용 가능`)
      }
    } catch (e) {
      setStatus((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const onApply = async () => {
    if (!update) return
    if (!confirm(`버전 ${update.version}을(를) 설치하고 앱을 재시작합니다. 진행할까요?`)) return
    setBusy(true)
    setStatus('다운로드/설치 중…')
    try {
      await audit('backup_export', { detail: `업데이트 적용: ${update.version}` })
      await update.download((d, t) => setProgress(t ? Math.round((d / t) * 100) : null))
    } catch (e) {
      setStatus('업데이트 실패: ' + (e as Error).message)
      setBusy(false)
    }
  }

  return (
    <div className="panel">
      <h3>업데이트</h3>
      <p className="muted">현재 버전: {version}</p>
      {desktop ? (
        <>
          <div className="row">
            <button onClick={onCheck} disabled={busy}>업데이트 확인</button>
            {update && (
              <button className="primary" onClick={onApply} disabled={busy}>
                설치 후 재시작
              </button>
            )}
          </div>
          {status && <p style={{ marginTop: 8 }}>{status}</p>}
          {progress != null && <p className="muted">다운로드 {progress}%</p>}
          {update?.notes && (
            <pre style={{ whiteSpace: 'pre-wrap', marginTop: 8 }} className="muted">{update.notes}</pre>
          )}
        </>
      ) : (
        <p className="muted">
          자동 업데이트는 데스크톱 앱에서만 지원됩니다. (Tauri 업데이터 + GitHub Releases · 사용자 확인형)
        </p>
      )}
    </div>
  )
}
