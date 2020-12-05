import assert from 'assert'

export default async ({
  page,
  port,
  project,
  tagline = 'just a test',
  pitch = 'a simple _test_ project',
  language = 'C',
  urls = [
    `https://github.com/example/${project}`,
    `http://example.com/${project}`
  ],
  price,
  category = 'library',
  test
}) => {
  assert(page)
  assert(Number.isSafeInteger(port))
  assert(typeof project === 'string')
  assert(Number.isSafeInteger(price))
  assert(typeof category === 'string')
  await page.goto('http://localhost:' + port)
  await page.click('#account')
  await page.click('"Create Project"')
  const createForm = '#createForm'
  await page.fill(`${createForm} input[name="project"]`, project)
  await page.fill(`${createForm} input[name="tagline"]`, tagline)
  await page.fill(`${createForm} textarea[name="pitch"]`, pitch)
  const urlInputs = await page.$$('input[name="urls"]')
  for (let index = 0; index < urls.length; index++) {
    await urlInputs[index].fill(urls[index])
  }
  await page.fill(`${createForm} input[name="price"]`, price.toString())
  await page.selectOption(`${createForm} select[name="language"]`, language)
  await page.selectOption(`${createForm} select[name="category"]`, category)
  await page.click(`${createForm} input[name=terms]`)
  await page.click(`${createForm} button[type="submit"]`)
}
