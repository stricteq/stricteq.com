import connectStripe from './connect-stripe.js'
import createProject from './create-project.js'
import http from 'http'
import interactive from './interactive.js'
import login from './login.js'
import logout from './logout.js'
import pay from './pay.js'
import signup from './signup.js'
import simpleConcat from 'simple-concat'
import testEvents from '../../test-events.js'
import timeout from './timeout.js'

const project = 'apple'
const urls = ['http://example.com']
const price = 11
const category = 'library'

interactive('user page', async ({ page, port, test }) => {
  const name = 'Ana Tester'
  const location = 'US-CA'
  const handle = 'ana'
  const password = 'ana password'
  const email = 'ana@example.com'
  await signup({ page, port, name, location, handle, password, email })

  // Browse user page.
  await page.goto(`http://localhost:${port}/~${handle}`)
  const h2Text = await page.textContent('h2')
  test.equal(h2Text, handle, 'handle')

  const locationText = await page.textContent('.location')
  test.equal(locationText, 'California, United States', 'displays location')

  // Create project.
  await login({ page, port, handle, password })
  await createProject({ page, port, project, urls, price, category })

  // Find project link on user page.
  await page.goto(`http://localhost:${port}/~${handle}`)
  const projects = await page.$('#selling')
  await projects.waitForSelector(`"${project}"`)
  test.pass('project link on user page')
})

interactive('user page licenses', async ({ page, port, test }) => {
  const ana = {
    name: 'Ana Tester',
    location: 'US-CA',
    handle: 'ana',
    password: 'ana password',
    email: 'ana@example.com'
  }
  const bob = {
    name: 'Bob Tester',
    location: 'US-NY',
    handle: 'bob',
    password: 'bob password',
    email: 'bob@example.com'
  }
  await signup(Object.assign({}, ana, { page, port }))
  await login({ page, port, handle: ana.handle, password: ana.password })

  await connectStripe({ page, port })

  // Confirm connected.
  await page.waitForSelector('#disconnect')

  // Create project.
  await createProject({ page, port, project, urls, price, category })
  await logout({ page, port })

  // As Bob...
  await signup(Object.assign({}, bob, { page, port }))
  await login({ page, port, handle: bob.handle, password: bob.password })

  // Buy a license.
  await page.goto(`http://localhost:${port}/~${ana.handle}/${project}`)

  // Confirm customer details are already prefilled.
  const nameValue = await page.getAttribute('#buyForm input[name=name]', 'value')
  test.equal(nameValue, bob.name, 'prefilled name')

  const emailValue = await page.getAttribute('#buyForm input[name=email]', 'value')
  test.equal(emailValue, bob.email, 'prefilled e-mail')

  const locationValue = await page.getAttribute('#buyForm input[name=location]', 'value')
  test.equal(locationValue, bob.location, 'prefilled location')

  // Enter credit card information.
  await pay({ page })

  // Accept terms.
  await page.click('#buyForm input[name=terms]')

  await Promise.all([
    new Promise((resolve, reject) => testEvents.once('sent', resolve)),
    page.click('#buyForm button[type=submit]')
  ])

  await timeout(7000)

  // Browse to Bob's user page.
  await page.goto(`http://localhost:${port}/~${bob.handle}`)
  const href = await page.getAttribute('#licenses a', 'href')
  test.equal(href, `/~${ana.handle}/${project}`)
}, 8080)

interactive('user JSON', async ({ page, port, test }) => {
  const name = 'Ana Tester'
  const location = 'US-CA'
  const handle = 'ana'
  const password = 'ana password'
  const email = 'ana@example.com'
  await signup({ page, port, name, location, handle, password, email })
  // Create project.
  await login({ page, port, handle, password })
  await page.click('#account')
  await page.click('"Create Project"')
  await page.fill('#createForm input[name="project"]', project)
  await page.fill('#createForm input[name="urls"]', 'http://example.com')
  await page.click('#createForm button[type="submit"]')
  await new Promise((resolve, reject) => {
    http.request({
      port,
      path: `/~${handle}`,
      headers: { Accept: 'application/json' }
    })
      .once('response', response => {
        test.equal(response.statusCode, 200, '200')
        simpleConcat(response, (error, buffer) => {
          test.ifError(error, 'no read error')
          const parsed = JSON.parse(buffer)
          test.equal(parsed.handle, handle, '.handle')
          test.equal(parsed.email, email, '.email')
          test.equal(typeof parsed.created, 'string', '.created')
          resolve()
        })
      })
      .end()
  })
})
