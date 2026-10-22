import { expect, test } from '@playwright/test'

test('paint, undo, redo, autosave restore, and PNG download', async ({ page }) => {
  await page.goto('/')
  const canvas = page.getByTestId('pixel-canvas')
  await expect(canvas).toBeVisible()
  const box = await canvas.boundingBox()
  if (!box) throw new Error('Canvas has no bounds')
  await page.mouse.move(box.x + box.width / 2 - 30, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2 + 30, box.y + box.height / 2, { steps: 2 })
  await page.mouse.up()
  await page.getByRole('button', { name: 'Undo' }).click()
  await page.getByRole('button', { name: 'Redo' }).click()
  await expect(page.getByTestId('save-status')).toContainText('SAVED', { timeout: 5000 })
  await page.reload()
  await expect(page.getByText('Last project restored.')).toHaveText('Last project restored.')
  if (test.info().project.name === 'mobile') {
    await page.getByRole('button', { name: 'Open color controls' }).click()
    await expect(page.getByRole('complementary', { name: 'Colors' })).toBeVisible()
    await page.getByRole('button', { name: 'Close color controls' }).click()
  }
  await page.getByRole('button', { name: 'Export PNG' }).click()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download PNG' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/-4x\.png$/)
})
