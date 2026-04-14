import { expect, test } from '@playwright/test'

const TEST_EMAIL = process.env.PLAYWRIGHT_TEST_EMAIL
const TEST_PASSWORD = process.env.PLAYWRIGHT_TEST_PASSWORD
const canRunAuthTests = Boolean(TEST_EMAIL && TEST_PASSWORD)

async function login(page) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(TEST_EMAIL!)
  await page.getByLabel('Password').fill(TEST_PASSWORD!)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/app\/dashboard/)
}

test.describe('Authenticated flows', () => {
  test.skip(!canRunAuthTests, 'Set PLAYWRIGHT_TEST_EMAIL and PLAYWRIGHT_TEST_PASSWORD to run these tests')

  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('dashboard shows stats and navigation', async ({ page }) => {
    await page.goto('/app/dashboard')
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
    await expect(page.getByText('Tests Today')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Patients' })).toBeVisible()
  })

  test('registers a new patient', async ({ page }) => {
    await page.goto('/app/patients/register')
    const timestamp = Date.now()
    await page.getByLabel('Full name').fill(`Test Patient ${timestamp}`)
    await page.getByLabel('Date of birth (DD/MM/YYYY)').fill('01/01/1990')
    await page.getByLabel('Phone').fill('08031234567')
    await page.getByLabel('Address').fill('123 Lab Street')
    await page.getByLabel('Next of kin name').fill('Helper Person')
    await page.getByLabel('Next of kin phone').fill('08031230000')
    await page.getByLabel(/I consent/).check()
    await page.getByRole('button', { name: 'Save patient' }).click()

    const toast = page.locator('.toast', { hasText: 'Patient registered' })
    await expect(toast).toBeVisible({ timeout: 10_000 })

    await page.goto('/app/patients')
    await expect(page.getByText(`Test Patient ${timestamp}`)).toBeVisible()
  })
})
