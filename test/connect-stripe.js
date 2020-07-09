module.exports = async ({ browser, port }) => {
  await browser.navigateTo(`http://localhost:${port}/`)
  const account = await browser.$('#account')
  await account.click()
  const connect = await browser.$('#connect')
  await connect.click()
  const skip = await browser.$('=Skip this account form')
  await skip.click()
}
