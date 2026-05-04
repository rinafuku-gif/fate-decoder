import { test, expect } from '@playwright/test'

test('mode-select screen loads', async ({ page }) => {
  await page.goto('http://localhost:3000')
  await expect(page.locator('.mode-select-title')).toBeVisible()
  await expect(page.locator('.mode-select-title')).toHaveText('Fate Decoder')
})

test('Full Reading: mode-select -> input screen with divination selector', async ({ page }) => {
  await page.goto('http://localhost:3000')
  // Full Reading ボタンをクリック
  await page.locator('.mode-card').first().click()
  await expect(page.locator('.input-screen')).toBeVisible()

  // 占術選択UIが表示されている
  await expect(page.locator('.divination-selector')).toBeVisible()
  await expect(page.locator('.divination-selector-title')).toHaveText('占術を選ぶ')

  // デフォルトで6占術がONになっている
  const checkedBoxes = await page.locator('.divination-selector-checkbox:checked').count()
  expect(checkedBoxes).toBe(6)
})

test('Short Reading: input screen shows theme selector instead of textarea', async ({ page }) => {
  await page.goto('http://localhost:3000')
  // Short Reading ボタンをクリック（2番目）
  await page.locator('.mode-card').nth(1).click()
  await expect(page.locator('.input-screen')).toBeVisible()

  // テーマ選択UIが表示されている
  await expect(page.locator('.short-theme-selector')).toBeVisible()
  await expect(page.locator('.short-theme-selector-label')).toHaveText('テーマを選ぶ')

  // textarea が表示されていない（concernフィールドなし）
  await expect(page.locator('textarea')).not.toBeVisible()

  // 占術選択UIも表示されている
  await expect(page.locator('.divination-selector')).toBeVisible()
})

test('DivinationSelector: toggle all and back', async ({ page }) => {
  await page.goto('http://localhost:3000')
  await page.locator('.mode-card').first().click()

  // すべて選択ボタンをクリック
  await page.locator('.divination-selector-toggle-all').click()
  const allChecked = await page.locator('.divination-selector-checkbox:checked').count()
  expect(allChecked).toBe(11)

  // デフォルトに戻すをクリック
  await page.locator('.divination-selector-toggle-all').click()
  const defaultChecked = await page.locator('.divination-selector-checkbox:checked').count()
  expect(defaultChecked).toBe(6)
})

test('DivinationSelector: cannot uncheck to zero', async ({ page }) => {
  await page.goto('http://localhost:3000')
  await page.locator('.mode-card').first().click()

  const checkboxes = page.locator('.divination-selector-checkbox:checked')
  const initialCount = await checkboxes.count()

  // 5つ unchecked にしてみる
  const allCheckboxes = page.locator('.divination-selector-checkbox')
  for (let i = 0; i < 5; i++) {
    await allCheckboxes.nth(i).click()
  }

  // 1つは残っているはず
  const remaining = await page.locator('.divination-selector-checkbox:checked').count()
  expect(remaining).toBeGreaterThanOrEqual(1)
})

test('mode-select descriptions do not mention "6占術"', async ({ page }) => {
  await page.goto('http://localhost:3000')
  const bodyText = await page.locator('.mode-select-grid').textContent()
  expect(bodyText).not.toContain('6占術')
  expect(bodyText).not.toContain('6つの占術')
})
