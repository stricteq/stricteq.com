const click = require('./click')
const connectStripe = require('./connect-stripe')
const createProject = require('./create-project')
const http = require('http')
const login = require('./login')
const logout = require('./logout')
const mail = require('../mail')
const server = require('./server')
const signup = require('./signup')
const simpleConcat = require('simple-concat')
const tape = require('tape')
const timeout = require('./timeout')
const webdriver = require('./webdriver')

const name = 'Ana Tester'
const location = 'US-CA'
const handle = 'ana'
const password = 'ana password'
const email = 'ana@example.com'
const project = 'apple'
const urls = ['http://example.com']
const price = 100
const category = 'library'

tape('project page', test => {
  const customerName = 'Jon Doe'
  const customerEMail = 'jon@exaple.com'
  const customerLocation = 'US-CA'
  server((port, done) => {
    (async () => {
      const browser = await webdriver()
      await signup({ browser, port, name, location, handle, password, email })
      await login({ browser, port, handle, password })
      await connectStripe({ browser, port })
      // Confirm connected.
      const disconnectButton = await browser.$('#disconnect')
      await disconnectButton.waitForExist()
      const disconnectText = await disconnectButton.getText()
      test.equal(disconnectText, 'Disconnect Stripe Account', 'connected')
      // Create project.
      await createProject({ browser, port, project, urls, price, category })
      await logout({ browser, port })
      await browser.navigateTo(`http://localhost:${port}/~${handle}/${project}`)
      const h2 = await browser.$('h2')
      const h2Text = await h2.getText()
      test.equal(h2Text, project, 'project page')
      const projectLink = await browser.$(`a[href="${urls[0]}"]`)
      await projectLink.waitForExist()
      test.pass('URL')
      const priceElement = await browser.$('#price')
      const priceText = await priceElement.getText()
      test.equal(priceText, `$${price}`, 'price')
      const categoryElement = await browser.$('#category')
      const categoryPrice = await categoryElement.getText()
      test.equal(categoryPrice, category, 'category')
      // Buy a license.
      // Fill in customer details.
      const nameInput = await browser.$('#buyForm input[name=name]')
      await nameInput.addValue(customerName)
      const emailInput = await browser.$('#buyForm input[name=email]')
      await emailInput.addValue(customerEMail)
      const locationInput = await browser.$('#buyForm input[name=location]')
      await locationInput.addValue(customerLocation)
      // Enter credit card information.
      const frame = await browser.$('iframe')
      await browser.switchToFrame(frame)
      const cardInput = await browser.$('input[name="cardnumber"]')
      await cardInput.addValue('42')
      await timeout(200)
      await cardInput.addValue('42')
      await timeout(200)
      await cardInput.addValue('42')
      await timeout(200)
      await cardInput.addValue('42')
      await timeout(200)
      await cardInput.addValue('42')
      await timeout(200)
      await cardInput.addValue('42')
      await timeout(200)
      await cardInput.addValue('42')
      await timeout(200)
      await cardInput.addValue('42')
      const expirationInput = await browser.$('input[name="exp-date"]')
      await expirationInput.setValue('10 / 31')
      const cvcInput = await browser.$('input[name="cvc"]')
      await cvcInput.setValue('123')
      const postInput = await browser.$('input[name="postal"]')
      await postInput.setValue('12345')
      await browser.switchToParentFrame()
      // Accept terms.
      await click(browser, '#buyForm input[name=terms]')
      await Promise.all([
        // Listen for customer e-mail.
        new Promise((resolve, reject) => {
          mail.events.on('sent', options => {
            if (options.to !== customerEMail) return
            test.equal(options.to, customerEMail, 'e-mail TO customer')
            test.equal(options.cc, email, 'e-mail CC developer')
            test.assert(
              options.text.includes(`$${price}`),
              'e-mail includes price'
            )
            test.assert(
              options.attachments.length > 0,
              'e-mail has attachment'
            )
            test.assert(
              /Order ID: `[a-f0-9-]+`/.test(options.text),
              'e-mail has order ID'
            )
            test.assert(
              /Signature: `[a-f0-9]+`/.test(options.text),
              'e-mail has signature'
            )
            resolve()
          })
        }),
        (async () => {
          // Click the buy button.
          await click(browser, '#buyForm button[type=submit]')
          const p = await browser.$('.message')
          await p.waitForExist({ timeout: 10000 })
          const message = await p.getText()
          test.assert(message.includes('Thank you', 'confirmation'))
        })()
      ])
      await browser.navigateTo(`http://localhost:${port}/~${handle}/${project}`)
      const img = await browser.$('#customers li img')
      const alt = await img.getAttribute('alt')
      test.equal(alt, customerName, 'Gravatar on project page')
    })().then(finish).catch(finish)

    function finish (error) {
      test.ifError(error)
      test.end()
      done()
    }
  }, 8080)
})

tape('project JSON', test => {
  server((port, done) => {
    (async () => {
      const browser = await webdriver()
      await signup({
        browser, port, name, location, handle, password, email
      })
      await login({ browser, port, handle, password })
      await createProject({ browser, port, project, urls, price, category })
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
    })().then(finish).catch(finish)

    function finish (error) {
      test.ifError(error)
      test.end()
      done()
    }
  })
})
