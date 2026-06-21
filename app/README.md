# NextChart — 전자차트

[진료기록관리_보조SW_개발계획서](../resources/난임/진료기록관리_보조SW_개발계획서.md)를 반영한
**전자서명 미지원·출력 관리형 전자차트.** Windows/Mac **데스크톱 앱(Tauri)** 으로 개발하며, UI는
React로 작성해 **브라우저 프리뷰**로도 개발한다.

- **완전 로컬 · 환자 데이터 외부 전송 없음.** 외부 연결은 업데이트 확인(버전 메타+서명 바이너리)뿐.
- 공식 진료기록부는 **출력·자필서명한 종이**이며, 이 앱과 로컬 DB(IndexedDB)는 작성을 돕는 **보조 사본**이다.
- 데이터 보안: **AES-256-GCM(Web Crypto) at-rest 암호화 + 봉투 암호화(비밀번호 파생 키)**. (SQLCipher는
  추후 인증·심사 요구 시 추상화 계층을 통해 교체 가능)
- **보험청구**(심평원 에이전트 연동, Windows 전용)는 추후 구현 — 모듈 경계만 확보.

## 실행

### 웹 (브라우저)
```bash
npm install
npm run dev      # http://127.0.0.1:5173
npm run build    # 프로덕션 빌드 (dist/)
```

### 데스크톱 (Tauri)
시스템 웹뷰로 같은 프론트엔드를 구동하는 네이티브 앱. **Rust 툴체인 필요**
([rustup.rs](https://rustup.rs)).
```bash
npm run tauri:dev     # 개발 모드(핫리로드) 데스크톱 창
npm run tauri:build   # 배포 패키지 (.app / .dmg / .deb / .msi 등)
```
완전 로컬 — 네트워크 플러그인/권한 미사용. 데이터는 OS별 웹뷰 저장소(IndexedDB)에 앱계층
암호화로 보관된다. 산출물: `src-tauri/target/release/bundle/`.

#### 플랫폼별 빌드
Tauri는 **타깃 OS에서 빌드**가 원칙이다(크로스컴파일 비권장).

| 타깃 | 산출물 | 빌드 위치 |
|---|---|---|
| macOS | `.app`, `.dmg` | macOS (검증 완료) |
| Windows | `.msi`(WiX), `.exe`(NSIS) | Windows에서 빌드 — Rust(MSVC) + VS C++ Build Tools + WebView2(Win10/11 기본 내장) |
| Linux | `.deb`, `.AppImage`, `.rpm` | Linux |

Windows 아이콘(`icon.ico`)·Store 로고는 이미 생성돼 있어 설정상 Windows 빌드가 가능하다.
로컬 Windows 머신이 없으면 [.github/workflows/build.yml](../.github/workflows/build.yml)의
GitHub Actions(`windows-latest`)로 자동 빌드한다(러너에 MSVC·WebView2 기본 탑재).

#### 자동 업데이트 (Tauri 업데이터 + GitHub Releases)
사용자 확인형(무음 아님). 앱 내 **[백업] 화면 → 업데이트** 패널에서 확인·설치한다.

- 서명: ed25519 키로 업데이트 아티팩트를 서명, 공개키는 `tauri.conf.json`에 내장.
- 배포: `main` 푸시 → CI가 patch 버전 자동 증가·태그 후 빌드·서명·GitHub Release 게시(`latest.json` 포함).
- **저장소 Secrets 필요**: `TAURI_SIGNING_PRIVATE_KEY`(= `~/.tauri/next-chart.key` 내용),
  `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`. (업데이터 endpoints는 `spynos/next-chart`로 설정됨.)
- **선결 과제**: 배포 전 OS 코드서명 필요 — macOS Apple Developer ID+공증, Windows Authenticode 인증서.
  (없으면 설치·업데이트 시 Gatekeeper/SmartScreen 경고)
- 업데이트 체크는 유일한 외부 호출이며 **환자 데이터는 전송하지 않는다.**

첫 실행 시 **기관명 + 관리자(의료인) 계정**을 만든다. 이 비밀번호가 데이터 암호화 키를 보호하므로
분실 시 복구 불가.

## 검증 (Playwright)

```bash
npx playwright install chromium
npm run dev &            # 서버 먼저 기동
npm run test:e2e         # 설정→환자→차트→출력→서명→감사로그 전 흐름
npm run test:tamper      # 감사로그 변조 → 해시체인 손상 탐지
```

## 계획서 요건 매핑

| 계획서 요건 | 구현 위치 |
|---|---|
| at-rest 암호화 AES-256-GCM (NFR-01) | [crypto.ts](src/lib/crypto.ts) · 모든 환자/차트/출력본 payload 암호화 [repo.ts](src/lib/repo.ts) |
| 키 관리: 봉투 암호화, 비밀번호 파생 KEK로 DEK 래핑, 평문 키 저장 금지 (NFR-02) | [crypto.ts](src/lib/crypto.ts) `wrapDek`/`unwrapDek`, DEK는 세션 메모리만 [session.ts](src/lib/session.ts) |
| 접근통제 · 계정/권한 · 최소권한 (NFR-03, FR-06) | [auth.ts](src/lib/auth.ts), RBAC, [UsersPage](src/pages/UsersPage.tsx) |
| 감사로그 append-only + 해시체인 + 2년 보관 (NFR-04) | [audit.ts](src/lib/audit.ts) · 직렬화 큐로 체인 정합성 보장 |
| 감사로그 별도 매체 내보내기 (NFR-05) | [backup.ts](src/lib/backup.ts) `exportAuditLog` |
| 화면 자동잠금/유휴 타임아웃 (NFR-06) | [state.tsx](src/state.tsx) 10분 유휴 자동잠금 |
| 백업(암호화) (NFR-07) | [backup.ts](src/lib/backup.ts) — payload 암호화 상태로 내보냄 |
| 필수기재 검증 + 출력 경고 (§3.2, 부록 A) | [forms/index.ts](src/forms/index.ts) `validateForPrint` |
| 출력본 스냅샷·문서해시 (AR-03) | [repo.ts](src/lib/repo.ts) `createPrintout`, [PrintDoc](src/components/PrintDoc.tsx) |
| 출력 2종: **PDF 저장** / **즉시 출력(프린터)** | [PrintView](src/pages/PrintView.tsx), [pdf.ts](src/lib/pdf.ts) |
| 정정 시 원본 폐기 금지·정정본 별도 출력 (AR-04, §6.3) | [PrintView](src/pages/PrintView.tsx) |
| 종이 진본 원칙 UI 명시 (AR-01) | [Layout](src/components/Layout.tsx) 상단 배너 |
| 부부(배우자) 차트 연결 + 통합 보기 | [repo.ts](src/lib/repo.ts) `linkSpouse`, [CoupleView](src/pages/CoupleView.tsx) |

## 서식 (PDF → 스키마)

ver4.0 PDF 2종을 스키마 데이터로 디지털화. 제너릭 [FormRenderer](src/components/FormRenderer.tsx)가
입력 UI와 인쇄 서식을 동시에 생성한다.

- 초진 (여성 [femaleInitial](src/forms/femaleInitial.ts) / 남성 [maleInitial](src/forms/maleInitial.ts))
- 주기 경과기록지 1~4 (여성 [femaleCycle](src/forms/femaleCycle.ts) / 남성 [maleCycle](src/forms/maleCycle.ts))
- 치료 결과지 ([femaleResult](src/forms/femaleResult.ts))
- 변증(여성 5형 / 남성 4형), 순응도 자동계산 포함

## 데스크톱 이행 경로

웹 프로토타입의 보안 모델은 데스크톱 패키징 시 그대로 상위 호환된다.

- IndexedDB + 앱계층 암호화 → **SQLCipher 투명 암호화** (계획서 §4.2)
- 비밀번호 파생 KEK → **OS 키스토어**(macOS Keychain / Windows DPAPI) (NFR-02)
- 데이터 계층은 [repo.ts](src/lib/repo.ts)로 추상화 → PostgreSQL/다단말 이행 대비 (§4.4)

## 보안 한계 (프로토타입)

- 브라우저 IndexedDB는 SQLCipher 같은 **DB 파일 단위 투명 암호화**가 아니라 앱계층 레코드 암호화다.
  키 인덱싱을 위해 일부 opaque UUID(환자/차트 식별자)는 평문 인덱스로 둔다(민감정보 아님).
- 실제 진료 적용 전 계획서 §5 검증·법률 검토 필요.
