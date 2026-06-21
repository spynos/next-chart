import pkg from 'playwright'
const { chromium } = pkg
const base = 'http://127.0.0.1:5173'
const browser = await chromium.launch()
const page = await browser.newPage()
await page.goto(base, { waitUntil: 'networkidle' })

// 최소 설정
await page.getByPlaceholder('○○한의원').fill('새봄한의원')
await page.locator('label:has-text("의료인 성명") + input').fill('김한의')
await page.locator('label:has-text("로그인 아이디") + input').fill('admin')
await page.locator('label:has-text("비밀번호 (8자 이상)") + input').fill('password1234')
await page.locator('label:has-text("비밀번호 확인") + input').fill('password1234')
await page.getByRole('button', { name: '시스템 시작' }).click()
await page.waitForSelector('text=대시보드')

// 감사로그 정상 확인
await page.goto(base + '/#/audit', { waitUntil: 'networkidle' })
await page.waitForSelector('text=감사로그')
const before = await page.locator('.chain-ok, .chain-bad').first().innerText()
console.log('변조 전 무결성:', before.trim())

// IndexedDB의 audit 레코드를 직접 변조 (해시는 그대로, 메타만 바꿈)
const tampered = await page.evaluate(async () => {
  const open = indexedDB.open('next-chart')
  const db = await new Promise((res) => (open.onsuccess = () => res(open.result)))
  const tx = db.transaction('audit', 'readwrite')
  const store = tx.objectStore('audit')
  const all = await new Promise((res) => {
    const r = store.getAll()
    r.onsuccess = () => res(r.result)
  })
  const rec = all[0]
  rec.action = 'login' // 다른 행위로 위조 (hash는 그대로 둠)
  rec.actorId = 'attacker'
  await new Promise((res) => {
    const r = store.put(rec)
    r.onsuccess = () => res()
  })
  return rec.seq
})
console.log('변조한 레코드 seq:', tampered)

// 새로고침 후 재로그인(세션 DEK는 메모리에만 — 새로고침 시 잠김, NFR-06)
await page.reload({ waitUntil: 'networkidle' })
await page.waitForSelector('text=로그인')
await page.locator('.field:has-text("아이디") input').fill('admin')
await page.locator('.field:has-text("비밀번호") input').fill('password1234')
await page.getByRole('button', { name: '로그인' }).click()
await page.waitForSelector('text=대시보드')
await page.goto(base + '/#/audit', { waitUntil: 'networkidle' })
await page.waitForSelector('text=감사로그')
const after = await page.locator('.chain-bad').first().innerText().catch(() => '(없음)')
const badCount = await page.locator('.chain-bad').count()
console.log('변조 후 감지:', after.trim(), '| 변조 플래그 수:', badCount)

await browser.close()
console.log(badCount > 0 ? 'RESULT: PASS (변조 탐지됨)' : 'RESULT: FAIL (탐지 실패)')
process.exit(badCount > 0 ? 0 : 1)
