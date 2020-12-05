import pay from './pay.js'

export default async ({
  page,
  port,
  handle,
  project,
  name,
  email,
  location = 'US-CA',
  number = '4242'.repeat(4),
  confirm = true
}) => {
  // Browse the project page.
  await page.goto(`http://localhost:${port}/~${handle}/${project}`)
  const buyForm = '#buyForm'
  // Fill in customer details.
  await page.fill(`${buyForm} input[name="name"]`, name)
  await page.fill(`${buyForm} input[name="email"]`, email)
  await page.fill(`${buyForm} input[name="location"]`, location)
  // Enter credit card information.
  await pay({ page, number })
  // Accept terms.
  await page.check(`${buyForm} input[name="terms"]`)
  // Click the buy button.
  await page.click(`${buyForm} button[type="submit"]`)
  if (confirm) await page.waitForSelector('.message')
}
