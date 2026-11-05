// 用法：先 `npm run build && npx vite preview --port 4173`，再 `node e2e/flow.mjs [截圖資料夾]`
import assert from 'node:assert/strict'
import { chromium, devices } from 'playwright'

const BASE = process.env.BASE_URL ?? 'http://localhost:4173/'
const SHOTS = process.argv[2]
const PHOTO = new URL('../public/pwa-512x512.png', import.meta.url).pathname

const browser = await chromium.launch()
const ctx = await browser.newContext({ ...devices['iPhone 14'] })
const page = await ctx.newPage()
const shot = async (name) => SHOTS && page.screenshot({ path: `${SHOTS}/${name}.png` })
const step = (s) => console.log('✓', s)

await page.goto(BASE)
await page.getByText('健身紀錄').first().waitFor()
await page.getByRole('button', { name: '上肢', exact: true }).waitFor()
step('日曆載入，種子菜單存在')

// 設定上肢菜單：兩個器材
await page.getByRole('link', { name: '菜單' }).click()
await page.getByRole('link', { name: /上肢/ }).click()
await page.getByRole('link', { name: '編輯' }).click()
for (const [i, name] of ['胸推機', '划船機'].entries()) {
  await page.getByRole('button', { name: '＋ 新增器材' }).click()
  const editor = page.getByTestId('exercise-editor').nth(i)
  await editor.waitFor()
  await editor.getByPlaceholder(/名稱/).fill(name)
  await editor.getByPlaceholder(/名稱/).blur()
}
await page.getByTestId('exercise-editor').first().locator('input[type=file]').setInputFiles(PHOTO)
await page.getByText('換照片').first().waitFor()
await shot('1-menu-edit')
step('新增 2 個器材並上傳照片')

await page.getByRole('button', { name: '返回' }).click()
await page.getByText('4 組 × 10 下').first().waitFor()
assert.equal(await page.getByText('還沒有紀錄').count(), 2)
await shot('2-menu-detail')
step('菜單預覽顯示組數與尚無紀錄')

// 日曆選今天上肢 → 進訓練頁
await page.getByRole('link', { name: '日曆' }).click()
await page.getByRole('button', { name: '上肢', exact: true }).click()
await page.waitForURL(/#\/session\/\d+\/0$/)
await page.getByTestId('exercise-name').filter({ hasText: '胸推機' }).waitFor()
assert.match(await page.getByTestId('last-performance').textContent(), /第一次/)
await shot('3-workout-top')
step('選上肢後跳到訓練頁第 1 個器材')

// 往下滑記錄：一次只展開一組
const rows = page.getByTestId('set-row')
const openRow = page.locator('[data-testid="set-row"][data-done="false"]')
const addBtn = page.getByRole('button', { name: '＋ 加一組' })
const weightOf = (row) => row.getByLabel('重量', { exact: true })
const expectValue = async (input, v) => {
  for (let i = 0; i < 50 && (await input.inputValue()) !== v; i++) await page.waitForTimeout(50)
  assert.equal(await input.inputValue(), v)
}
await rows.first().waitFor()
assert.equal(await rows.count(), 1)
assert.equal(await addBtn.count(), 0)
await weightOf(openRow).fill('40')
await openRow.getByLabel('重量增加').click()
await expectValue(weightOf(openRow), '41')
await openRow.getByLabel('次數', { exact: true }).fill('12')
await shot('4-workout-open')
await openRow.getByLabel('完成這組').click()
await page.getByRole('button', { name: '修改第 1 組' }).filter({ hasText: '41 kg × 12' }).waitFor()
await addBtn.waitFor()
step('第 1 組：打字＋按 +1 kg，打勾後縮起、出現加一組')

await addBtn.click()
await openRow.waitFor()
assert.equal(await weightOf(openRow).inputValue(), '41')
assert.equal(await openRow.getByLabel('次數', { exact: true }).inputValue(), '12')
assert.equal(await addBtn.count(), 0)
await weightOf(openRow).fill('42.5')
await openRow.getByLabel('完成這組').click()
await addBtn.click()
await openRow.waitFor()
assert.equal(await weightOf(openRow).inputValue(), '42.5')
await openRow.getByLabel('重量減少').click()
await openRow.getByLabel('完成這組').click()
await page.getByRole('button', { name: '修改第 3 組' }).filter({ hasText: '41.5 kg × 12' }).waitFor()
step('加一組帶入上一組的重量與次數')

await page.getByRole('button', { name: '修改第 2 組' }).click()
await openRow.waitFor()
assert.equal(await addBtn.count(), 0)
await weightOf(openRow).fill('43')
await openRow.getByLabel('完成這組').click()
await page.getByRole('button', { name: '修改第 2 組' }).filter({ hasText: '43 kg × 12' }).waitFor()
step('點縮起的組重新展開修改')

// 打字當下就存：沒離開欄位直接重新載入，數字仍在
await addBtn.click()
await openRow.waitFor()
await weightOf(openRow).fill('50')
await page.waitForTimeout(300)
await page.reload()
await openRow.waitFor()
assert.equal(await weightOf(openRow).inputValue(), '50')
await openRow.getByRole('button', { name: '刪除這組' }).click()
await addBtn.waitFor()
assert.equal(await rows.count(), 3)
await shot('5-workout-collapsed')
step('輸入中重新載入不丟資料；可刪除未完成的組')

await page.getByRole('button', { name: '下一個 ›' }).click()
await page.waitForURL(/\/1$/)
await page.getByTestId('exercise-name').filter({ hasText: '划船機' }).waitFor()
await page.getByRole('button', { name: '‹ 上一個' }).click()
await page.waitForURL(/\/0$/)
await page.getByTestId('exercise-name').filter({ hasText: '胸推機' }).waitFor()
await page.getByRole('button', { name: '修改第 3 組' }).waitFor()
assert.equal(await page.locator('[data-testid="set-row"][data-done="true"]').count(), 3)
step('下一個／上一個切換，紀錄保留')

await page.getByRole('button', { name: '下一個 ›' }).click()
await page.getByRole('button', { name: '完成訓練' }).click()
await page.waitForURL(/#\/$/)
await page.reload()
const today = new Date()
const key = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
assert.match(await page.locator(`[data-date="${key}"]`).textContent(), /上肢/)
await page.getByRole('button', { name: /繼續訓練（已完成 3 組）/ }).waitFor()
await shot('6-calendar')
step('完成後回日曆，重新整理後今天仍標示上肢')

await page.getByRole('link', { name: '菜單' }).click()
await page.getByRole('link', { name: /上肢/ }).click()
await page.getByText(/上次 43 kg × 12/).waitFor()
step('菜單預覽顯示最後一次重量 43 kg × 12')

// 休息日
await page.getByRole('link', { name: '日曆' }).click()
const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)
const yKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`
if (yesterday.getMonth() === today.getMonth() || (await page.locator(`[data-date="${yKey}"]`).count())) {
  await page.locator(`[data-date="${yKey}"]`).click()
  await page.getByRole('button', { name: '休息', exact: true }).click()
  await page.locator(`[data-date="${yKey}"]`).filter({ hasText: '休息' }).waitFor()
  step('昨天標記為休息')
}

await page.getByRole('link', { name: '設定' }).click()
await shot('7-settings')

await browser.close()
console.log('E2E 全部通過')
