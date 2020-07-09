module.exports = async (browser, selector) => {
  const element = await browser.$(selector)
  await element.waitForExist()
  await element.click()
}
