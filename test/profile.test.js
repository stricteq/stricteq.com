import login from './login.js'
import signup from './signup.js'
import verifyLogIn from './verify-login.js'
import interactive from './interactive.js'

interactive('change profile', async ({ page, port, test }) => {
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
  await signup({ page, port, name, location, handle, password, email })
  await login({ page, port, handle, password })
  await verifyLogIn({ page, port, test, handle, email })

  // Navigate to profile-change page.
  await page.goto('http://localhost:' + port)
  await page.click('#account')
  await page.click('"Change Profile"')

  // Input changes.
  const profileForm = '#profileForm'
  await page.fill(`${profileForm} input[name="name"]`, newName)
  await page.fill(`${profileForm} input[name="location"]`, newLocation)
  await page.fill(`${profileForm} input[name="affiliations"]`, affiliations)
  await page.fill(`${profileForm} input[name="urls"]`, url)

  // Submit.
  await page.click(`${profileForm} button[type="submit"]`)

  // Check updated user page.
  const nameText = await page.textContent('.name')
  test.equal(nameText, newName, 'displays new name')

  const locationText = await page.textContent('.location')
  test.equal(locationText, 'Texas, United States', 'displays new location')

  const affiliationsText = await page.textContent('.affiliations')
  test.equal(affiliationsText, affiliations, 'displays new affiliations')

  const urlsText = await page.textContent('.urls')
  test.equal(urlsText, 'example.com', 'displays new URL')
})
