import assert from 'assert'

export default async ({
  page,
  test,
  port,
  handle
}) => {
  assert(page)
  assert(test)
  assert(Number.isSafeInteger(port))
  assert(typeof handle === 'string')
  await page.goto('http://localhost:' + port)
  await page.waitForSelector('#profile')
  const text = await page.textContent('#profile')
  test.equal(text, handle, 'shows handle')
}
