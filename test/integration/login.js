import assert from 'assert'

export default async ({ page, port, handle, password }) => {
  assert(page)
  assert(Number.isSafeInteger(port))
  assert(typeof handle === 'string')
  assert(typeof password === 'string')
  await page.goto('http://localhost:' + port)
  await page.click('#login')
  await page.fill('#loginForm input[name="handle"]', handle)
  await page.fill('#loginForm input[name="password"]', password)
  await page.click('#loginForm button[type="submit"]')
}
