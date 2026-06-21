// NextChart 전자차트 — Tauri 앱 코어.
// 프론트엔드(React/IndexedDB+WebCrypto)는 시스템 웹뷰에서 완전 로컬로 실행된다.
// 환자 데이터의 외부 전송은 없으며, 외부 연결은 업데이트 확인(버전 메타+서명 바이너리)뿐이다.

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // 사용자 확인형 자동 업데이트 (Tauri 업데이터 + GitHub Releases)
        .plugin(tauri_plugin_updater::Builder::new().build())
        // 업데이트 설치 후 재시작 등 프로세스 제어
        .plugin(tauri_plugin_process::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
