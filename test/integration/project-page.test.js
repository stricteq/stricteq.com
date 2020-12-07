import buy from './buy.js'
import connectStripe from './connect-stripe.js'
import createProject from './create-project.js'
import http from 'http'
import interactive from './interactive.js'
import login from './login.js'
import logout from './logout.js'
import signup from './signup.js'
import simpleConcat from 'simple-concat'
import testEvents from '../../test-events.js'

const name = 'Ana Tester'
const location = 'US-CA'
const handle = 'ana'
const password = 'ana password'
const email = 'ana@example.com'
const project = 'apple'
const urls = ['http://example.com']
const price = 100
const category = 'library'

interactive('project page', async ({ page, port, test }) => {
  const customerName = 'Jon Doe'
  const customerEMail = 'jon@exaple.com'
  const customerLocation = 'US-CA'
  await signup({ page, port, name, location, handle, password, email })
  await login({ page, port, handle, password })
  await connectStripe({ page, port })
  // Confirm connected.
  const disconnectText = await page.textContent('#disconnect')
  test.equal(disconnectText, 'Disconnect Stripe Account', 'connected')
  // Create project.
  await createProject({ page, port, project, urls, price, category })
  await logout({ page, port })
  await page.goto(`http://localhost:${port}/~${handle}/${project}`)
  const h2Text = await page.textContent('h2')
  test.equal(h2Text, project, 'project page')
  await page.waitForSelector(`a[href="${urls[0]}"]`)
  test.pass('URL')
  const priceText = await page.textContent('#price')
  test.equal(priceText, `$${price}`, 'price')
  const categoryText = await page.textContent('.category')
  test.equal(categoryText, category, 'category')
  // Buy a license.
  await Promise.all([
    buy({
      page,
      port,
      handle,
      project,
      name: customerName,
      email: customerEMail,
      location: customerLocation
    }),
    // Listen for customer e-mail.
    new Promise((resolve, reject) => {
      testEvents.on('sent', ({ to, cc, subject, text, attachments }) => {
        if (to !== customerEMail) return
        test.equal(to, customerEMail, 'e-mail TO customer')
        test.equal(cc, email, 'e-mail CC developer')
        test.assert(text.includes(`$${price}`), 'e-mail includes price')
        test.assert(attachments.length > 0, 'e-mail has attachment')
        test.assert(/Order ID: `[a-f0-9-]+`/.test(text), 'e-mail has order ID')
        test.assert(/Signature: `[a-f0-9]+`/.test(text), 'e-mail has signature')
        resolve()
      })
    }),
    Promise.all([
      new Promise((resolve, reject) => {
        testEvents.once('payment_intent.succeeded', () => {
          resolve()
        })
      }),
      async () => {
        const message = await page.textContent('.message')
        test.assert(message.includes('Thank you', 'confirmation'))
      }
    ])
  ])
  await page.goto(`http://localhost:${port}/~${handle}/${project}`)
  const alt = await page.getAttribute('#customers li img', 'alt')
  test.equal(alt, customerName, 'Gravatar on project page')
}, 8080)

interactive('project edit form', async ({ page, port, test }) => {
  const newPrice = 123
  const newURL = 'http://changed.com'
  const newCategory = 'application'
  await signup({ page, port, name, location, handle, password, email })
  await login({ page, port, handle, password })
  await createProject({ page, port, project, urls, price, category })
  // Change url.
  await page.fill('#projectForm input[name=urls]', newURL)
  // Change category.
  await page.selectOption('#projectForm select[name="category"]', newCategory)
  // Change price.
  await page.fill('#projectForm input[name=price]', newPrice.toString())
  await page.click('#projectForm button[type=submit]')
  // Log out and visit project page as customer.
  await logout({ page, port })
  await page.goto(`http://localhost:${port}/~${handle}/${project}`)
  // Verify price updated.
  const priceText = await page.textContent('#price')
  test.equal(priceText, `$${newPrice}`, 'price')
  // Verify new URL.
  await page.waitForSelector(`a[href="${newURL}"]`)
  test.pass('URL')
  // Verify new category.
  const categoryText = await page.textContent('.category')
  test.equal(categoryText, newCategory, 'category')
}, 8080)

interactive('project JSON', async ({ page, port, test }) => {
  await signup({ page, port, name, location, handle, password, email })
  await login({ page, port, handle, password })
  await createProject({ page, port, project, urls, price, category })
  await new Promise((resolve, reject) => {
    http.request({
      port,
      path: `/~${handle}/${project}`,
      headers: { Accept: 'application/json' }
    })
      .once('response', response => {
        test.equal(response.statusCode, 200, '200')
        simpleConcat(response, (error, buffer) => {
          test.ifError(error, 'no read error')
          const parsed = JSON.parse(buffer)
          test.equal(parsed.project, project, '.project')
          test.equal(parsed.price, price, '.price')
          test.equal(parsed.category, category, '.category')
          test.deepEqual(parsed.urls, urls, '.urls')
          test.equal(typeof parsed.created, 'string', '.created')
          test.equal(typeof parsed.account, 'object', '.account')
          resolve()
        })
      })
      .end()
  })
})
