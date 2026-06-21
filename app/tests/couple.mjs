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

// 설정
await page.getByPlaceholder('○○한의원').fill('새봄한의원')
await page.locator('label:has-text("의료인 성명") + input').fill('김한의')
await page.locator('label:has-text("로그인 아이디") + input').fill('admin')
await page.locator('label:has-text("비밀번호 (8자 이상)") + input').fill('password1234')
await page.locator('label:has-text("비밀번호 확인") + input').fill('password1234')
await page.getByRole('button', { name: '시스템 시작' }).click()
await page.waitForSelector('text=대시보드')

async function addPatient(chartNo, name, sex) {
  await page.getByRole('link', { name: '환자' }).click()
  await page.getByRole('button', { name: '+ 환자 등록' }).click()
  await page.locator('.field:has-text("등록번호*") input').fill(chartNo)
  await page.locator('.field:has-text("성명*") input').fill(name)
  await page.locator('.field:has-text("성별") select').selectOption(sex)
  await page.getByRole('button', { name: '등록' }).click()
  await page.waitForSelector(`text=${name}`)
}

step('부부 환자 2명 등록')
await addPatient('F-001', '이영희', 'female')
await addPatient('M-001', '김철수', 'male')
console.log('  ✓ 이영희(여), 김철수(남) 등록')

step('이영희 → 배우자 연결')
await page.getByText('이영희').first().click()
await page.waitForSelector('text=배우자 (부부 연결)')
await page.getByRole('button', { name: '+ 배우자 연결' }).click()
await page.getByPlaceholder(/배우자로 연결할 환자/).fill('김철수')
await page.getByRole('button', { name: '이 환자와 연결' }).click()
await page.waitForSelector('text=배우자 차트 열기')
const linkedName = await page.locator('.panel:has-text("배우자 (부부 연결)") b').first().innerText()
console.log('  ✓ 연결된 배우자 표시:', linkedName)

step('역방향 연결 확인 (김철수 쪽)')
await page.getByRole('button', { name: '배우자 차트 열기' }).click()
await page.waitForSelector('h2:has-text("김철수")') // 김철수 상세 진입 확인
const reverse = await page.locator('.panel:has-text("부부 연결") b').first().innerText()
console.log('  ✓ 김철수의 배우자:', reverse, '| 양방향:', reverse === '이영희')

step('부부 통합 보기')
await page.getByRole('button', { name: '부부 통합 보기 →' }).click()
await page.waitForSelector('text=부부 통합 보기')
const bodyText = await page.locator('main').innerText()
console.log('  ✓ 통합 보기 두 사람 표시:', bodyText.includes('이영희') && bodyText.includes('김철수'))

step('연결 해제')
await page.locator('.panel:has-text("이영희") button:has-text("상세")').first().click()
await page.waitForSelector('h2:has-text("이영희")')
await page.waitForSelector('text=배우자 차트 열기')
page.once('dialog', (d) => d.accept())
await page.getByRole('button', { name: '연결 해제' }).click()
await page.waitForSelector('text=연결된 배우자가 없습니다')
console.log('  ✓ 연결 해제됨')

console.log('\nconsole errors:', errors.length ? errors : '없음')
await browser.close()
console.log(errors.length ? 'RESULT: FAIL' : 'RESULT: PASS')
process.exit(errors.length ? 1 : 0)
