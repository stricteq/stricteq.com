export default async ({ page, port }) => {
  await page.goto('http://localhost:' + port + '/')
  await page.click('#logout')
}
