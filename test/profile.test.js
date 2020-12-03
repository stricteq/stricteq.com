import click from './click.js'
import login from './login.js'
import signup from './signup.js'
import verifyLogIn from './verify-login.js'
import interactive from './interactive.js'

interactive('change profile', async ({ browser, port, test }) => {
  const name = 'Ana Tester'
  const newName = 'Ana Test Married'
  const location = 'US-CA'
  const newLocation = 'US-TX'
  const handle = 'tester'
  const password = 'test password'
  const email = 'ana@example.com'
  const affiliations = 'SomeCo, Inc.'
  const url = 'http://example.com'

  // Sign up.
  await signup({ browser, port, name, location, handle, password, email })
  await login({ browser, port, handle, password })
  await verifyLogIn({ browser, port, test, handle, email })

  // Navigate to profile-change page.
  await browser.navigateTo('http://localhost:' + port)
  await click(browser, '#account')
  await click(browser, 'a=Change Profile')

  // Input changes.
  const nameInput = await browser.$('#profileForm input[name="name"]')
  await nameInput.setValue(newName)

  const locationInput = await browser.$('#profileForm input[name="location"]')
  await locationInput.setValue(newLocation)

  const affiliationInput = await browser.$('#profileForm input[name="affiliations"]')
  await affiliationInput.setValue(affiliations)

  const urlInput = await browser.$('#profileForm input[name="urls"]')
  await urlInput.setValue(url)

  // Submit.
  await click(browser, '#profileForm button[type="submit"]')

  // Check updated user page.
  const displayedName = await browser.$('.name')
  await displayedName.waitForExist()
  const nameText = await displayedName.getText()
  test.equal(nameText, newName, 'displays new name')

  const displayedLocation = await browser.$('.location')
  await displayedLocation.waitForExist()
  const locationText = await displayedLocation.getText()
  test.equal(locationText, 'Texas, United States', 'displays new location')

  const displayedAffiliations = await browser.$('.affiliations')
  await displayedAffiliations.waitForExist()
  const associationsText = await displayedAffiliations.getText()
  test.equal(associationsText, affiliations, 'displays new affiliations')

  const displayedURLs = await browser.$('.urls')
  await displayedURLs.waitForExist()
  const urlsText = await displayedURLs.getText()
  test.equal(urlsText, 'example.com', 'displays new URL')
})
