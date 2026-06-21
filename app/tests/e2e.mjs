import pkg from 'playwright'
const { chromium } = pkg

const base = 'http://127.0.0.1:5173'
const browser = await chromium.launch()
const page = await browser.newPage()
const errors = []
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))

const step = (n) => console.log('▶', n)

await page.goto(base, { waitUntil: 'networkidle' })

// 1) 초기 설정 (Setup)
step('초기 설정')
await page.getByPlaceholder('○○한의원').fill('새봄한의원')
await page.locator('label:has-text("의료인 성명") + input').fill('김한의')
await page.locator('label:has-text("로그인 아이디") + input').fill('admin')
await page.locator('label:has-text("비밀번호 (8자 이상)") + input').fill('password1234')
await page.locator('label:has-text("비밀번호 확인") + input').fill('password1234')
await page.getByRole('button', { name: '시스템 시작' }).click()
await page.waitForSelector('text=대시보드', { timeout: 5000 })
console.log('  ✓ 설정 완료 → 대시보드 진입')

// 2) 환자 등록
step('환자 등록')
await page.getByRole('link', { name: '환자' }).click()
await page.getByRole('button', { name: '+ 환자 등록' }).click()
await page.locator('.field:has-text("등록번호*") input').fill('A-0001')
await page.locator('.field:has-text("성명*") input').fill('이영희')
await page.locator('.field:has-text("생년월일") input').fill('1990-05-10')
await page.locator('.field:has-text("주민등록번호") input').fill('900510-2123456')
await page.locator('.field:has-text("연락처") input').fill('010-1234-5678')
await page.getByRole('button', { name: '등록' }).click()
await page.waitForSelector('text=이영희', { timeout: 5000 })
console.log('  ✓ 환자 목록에 이영희 표시')

// 3) 환자 상세 → 초진(여성) 차트 생성
step('초진 차트 생성')
await page.getByText('이영희').first().click()
await page.waitForSelector('text=새 차트 작성')
await page.getByRole('button', { name: '+ 초진 (여성)' }).click()
await page.waitForSelector('text=일반정보 · 신체정보 · 기호품', { timeout: 5000 })
console.log('  ✓ 초진 여성 폼 렌더링')

// 4) 필수항목 입력
step('필수기재 입력')
await page.locator('.field:has-text("초진일자") input').fill('2026-06-21')
// 난임 변병 체크
await page.getByText('배란요인', { exact: true }).click()
// 변증
await page.getByText('신허(腎虛)형', { exact: true }).click()
// 치료내용
await page.locator('.field:has-text("한약 처방명") input').fill('온경탕')
await page.getByRole('button', { name: '저장' }).click()
await page.waitForTimeout(300)
console.log('  ✓ 저장 완료')

// 5) 출력(진본화) — PDF 저장
step('PDF 저장 (파일 다운로드)')
await page.getByRole('button', { name: /출력\(진본화\)/ }).click()
await page.waitForSelector('text=출력 (진본화)', { timeout: 5000 })
const downloadPromise = page.waitForEvent('download', { timeout: 15000 })
await page.getByRole('button', { name: /PDF 저장/ }).click()
const download = await downloadPromise
const fname = download.suggestedFilename()
console.log('  ✓ PDF 다운로드:', fname, '| .pdf:', fname.endsWith('.pdf'))
await page.waitForSelector('text=출력 이력', { timeout: 5000 })

// 6) 즉시 출력 (프린터) — window.print() 후킹, 정정본 기록 확인
step('즉시 출력 (프린터)')
await page.evaluate(() => { window.__printed = false; window.print = () => { window.__printed = true } })
await page.getByRole('button', { name: /즉시 출력/ }).click()
await page.waitForTimeout(800)
const printed = await page.evaluate(() => window.__printed === true)
const outRows = await page.locator('table tbody tr').count()
console.log('  ✓ window.print 호출:', printed, '| 출력 이력 행:', outRows)

// 7) 감사로그 + 체인검증
step('감사로그 무결성')
await page.getByRole('link', { name: '감사로그' }).click()
await page.waitForSelector('table tbody tr')
const chain = await page.locator('.chain-ok, .chain-bad').first().innerText()
const rows = await page.locator('table tbody tr').count()
console.log('  ✓ 감사로그', rows, '건, 무결성:', chain.trim())

console.log('\nconsole errors:', errors.length ? errors : '없음')
await browser.close()
console.log(errors.length ? 'RESULT: FAIL' : 'RESULT: PASS')
process.exit(errors.length ? 1 : 0)
