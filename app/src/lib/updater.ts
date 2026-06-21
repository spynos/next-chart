// 자동 업데이트 (Tauri 업데이터 + GitHub Releases).
// 의료용 통제 변경 원칙에 따라 "무음 자동설치"가 아니라 사용자 확인형으로 동작한다.
// 외부 호출은 버전 메타 확인 + 서명된 바이너리 다운로드뿐이며, 환자 데이터는 전송하지 않는다.
// 데스크톱(Tauri) 환경에서만 동작하고, 브라우저 프리뷰에서는 비활성.

export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

export async function getAppVersion(): Promise<string> {
  if (!isTauri()) return '0.1.0 (웹 프리뷰)'
  const { getVersion } = await import('@tauri-apps/api/app')
  return getVersion()
}

export interface AvailableUpdate {
  version: string
  notes?: string
  download: (onProgress?: (downloaded: number, total?: number) => void) => Promise<void>
}

/** 업데이트 확인. 새 버전이 있으면 AvailableUpdate, 없으면 null. */
export async function checkForUpdate(): Promise<AvailableUpdate | null> {
  if (!isTauri()) throw new Error('업데이트 확인은 데스크톱 앱에서만 지원됩니다.')
  const { check } = await import('@tauri-apps/plugin-updater')
  const update = await check()
  if (!update) return null
  return {
    version: update.version,
    notes: update.body,
    download: async (onProgress) => {
      let downloaded = 0
      let total: number | undefined
      await update.downloadAndInstall((event) => {
        if (event.event === 'Started') total = event.data.contentLength
        else if (event.event === 'Progress') {
          downloaded += event.data.chunkLength
          onProgress?.(downloaded, total)
        }
      })
      const { relaunch } = await import('@tauri-apps/plugin-process')
      await relaunch()
    },
  }
}
