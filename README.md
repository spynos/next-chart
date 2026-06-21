# NextChart — 오픈소스 한의원 전자차트

[![Release](https://img.shields.io/github/v/release/spynos/next-chart?label=release)](https://github.com/spynos/next-chart/releases/latest)
[![Downloads](https://img.shields.io/github/downloads/spynos/next-chart/total?label=downloads)](https://github.com/spynos/next-chart/releases)
[![License](https://img.shields.io/github/license/spynos/next-chart)](LICENSE)

**누구나 자유롭게 소스코드를 활용할 수 있는** 오픈소스 한의원 전자차트(EMR)입니다.
Windows / macOS 데스크톱 앱(Tauri + React)으로 동작하며, 환자 데이터는 외부로 전송하지 않고
**완전 로컬**로 보관됩니다.

> 공식 진료기록부는 **출력·자필서명한 종이**이며, 본 앱과 로컬 DB는 작성을 돕는 **보조 사본**입니다.

## 주요 특징

- 🏥 **한의원 전자차트** — 초진/경과기록/치료결과 서식, 부부(배우자) 차트 연결, 보험한약 처방 데이터 내장
- 🔓 **오픈소스** — 누구나 자유롭게 소스코드를 활용·수정·배포할 수 있습니다
- 💻 **Windows · macOS 지원** — 시스템 웹뷰 기반 네이티브 데스크톱 앱
- 🔒 **완전 로컬 · 외부 전송 없음** — AES-256-GCM at-rest 암호화, 감사로그 해시체인
- 🔄 **사용자 확인형 자동 업데이트** — GitHub Releases 기반(무음 아님)

## 계획 중인 기능 (아직 미구현)

- 🧾 **심평원 보험청구** — 보험청구 에이전트 연동(Windows 전용 예정)
- ✍️ **전자서명** — 현재는 출력 관리형(종이 진본 원칙). 전자서명 도입은 추후 인증·법률 검토 후

## 다운로드

> `main` 브랜치가 업데이트되면 CI가 자동으로 버전을 올려 빌드·릴리스를 게시합니다.
> 첫 릴리스가 게시되면 아래 링크가 활성화됩니다.

**[➡️ 모든 버전·파일 보기 (Releases)](https://github.com/spynos/next-chart/releases/latest)**

| 플랫폼 | 바로 다운로드 |
| --- | --- |
| 🪟 Windows (x64) | [설치 파일 (.exe)](https://github.com/spynos/next-chart/releases/latest/download/NextChart-windows-x64-setup.exe) · [.msi](https://github.com/spynos/next-chart/releases/latest/download/NextChart-windows-x64.msi) |
| 🍎 macOS (Apple Silicon) | [.dmg](https://github.com/spynos/next-chart/releases/latest/download/NextChart-macos-aarch64.dmg) |

> 위 직접 다운로드 링크는 항상 최신 정식 릴리스를 가리킵니다(draft/pre-release 제외).

설치 후 첫 실행 시 **기관명 + 관리자(의료인) 계정**을 생성합니다.
이 비밀번호가 데이터 암호화 키를 보호하므로 분실 시 복구할 수 없습니다.

> 코드서명 전이라 설치 시 Windows SmartScreen / macOS Gatekeeper 경고가 표시될 수 있습니다.

## 개발

소스에서 직접 빌드하거나 기여하려면 [app/README.md](app/README.md)를 참고하세요.

```bash
cd app
npm install
npm run dev          # 브라우저 프리뷰 (http://127.0.0.1:5173)
npm run tauri:dev    # 데스크톱 앱 (Rust 툴체인 필요)
npm run tauri:build  # 배포 패키지 빌드
```

## 라이선스

오픈소스 — 누구나 자유롭게 활용할 수 있습니다. (라이선스 파일은 [LICENSE](LICENSE) 참고)
