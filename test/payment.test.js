import connectStripe from './connect-stripe.js'
import createProject from './create-project.js'
import interactive from './interactive.js'
import login from './login.js'
import logout from './logout.js'
import pay from './pay.js'
import signup from './signup.js'

const name = 'Ana Tester'
const location = 'US-CA'
const handle = 'ana'
const password = 'ana password'
const email = 'ana@example.com'
const project = 'apple'
const url = 'http://example.com'
const price = 100
const category = 'library'

// https://stripe.com/docs/testing
const testNumbers = {
  4000000000000002: 'declined', // (generic decline)
  4000000000009995: 'insufficient', // insufficient_funds
  4000000000009987: 'declined', // lost_card
  4000000000009979: 'declined', // stolen_card
  4000000000000069: 'expired', // expired_card
  4000000000000127: 'security code', // incorrect_cvc
  4000000000000119: 'processing' // processing_erro
  // TODO: Test cards with client-side errors.
  // 4242424242424241: { client: true, code: 'incorrect_number' }
}

interactive('declined cards', async ({ page, port, test }) => {
  const customerName = 'Jon Doe'
  const customerEMail = 'jon@exaple.com'
  const customerLocation = 'US-CA'
  await signup({ page, port, name, location, handle, password, email })
  await login({ page, port, handle, password })
  await connectStripe({ page, port })
  // Confirm connected.
  const disconnectText = await page.textContent('#disconnect')
  test.equal(disconnectText, 'Disconnect Stripe Account', 'connected')
  await createProject({ page, port, project, urls: [url], price, category })
  test.pass('created project')
  await logout({ page, port })
  test.pass('logged out')
  // Buy licenses.
  const buyForm = '#buyForm'
  for await (const number of Object.keys(testNumbers)) {
    await page.goto(`http://localhost:${port}/~${handle}/${project}`)
    // Fill in customer details.
    await page.fill(`${buyForm} input[name=name]`, customerName)
    await page.fill(`${buyForm} input[name=email]`, customerEMail)
    await page.fill(`${buyForm} input[name=location]`, customerLocation)
    // Enter credit card information.
    await pay({ page, number })
    // Accept terms.
    await page.click(`${buyForm} input[name=terms]`)
    // Click the buy button.
    await page.click(`${buyForm} button[type=submit]`)
    const errorText = await page.textContent('.error')
    const watchWord = testNumbers[number]
    test.assert(errorText.includes(watchWord), `declined: ${watchWord}`)
  }
}, 8080)

/*
interactive('3D Secure card', async ({ page, port, test }) => {
  const customerName = 'Jon Doe'
  const customerEMail = 'jon@exaple.com'
  const customerLocation = 'US-CA'
  await signup({ page, port, name, location, handle, password, email })
  await login({ page, port, handle, password })
  await connectStripe({ page, port })
  // Confirm connected.
  const disconnectText = await page.textContent('#disconnect')
  test.equal(disconnectText, 'Disconnect Stripe Account', 'connected')
  await createProject({ page, port, project, urls: [url], price, category })
  await logout({ page, port })
  // Buy licenses.
  const number = '4000000000003220'
  await page.goto(`http://localhost:${port}/~${handle}/${project}`)
  // Fill in customer details.
  const buyForm = '#buyForm'
  await page.fill(`${buyForm} input[name="name"]`, customerName)
  await page.fill(`${buyForm} input[name="email"]`, customerEMail)
  await page.fill(`${buyForm} input[name="location"]`, customerLocation)
  // Enter credit card information.
  await pay({ page, number })
  // Accept terms.
  await page.click(`${buyForm} input[name="terms"]`)
  // Click the buy button.
  await page.click(`${buyForm} button[type="submit"]`)
  const messageText = await page.textContent('.message')
  test.assert(messageText.includes('Thank you', 'confirmation'))
}, 8080)
*/
