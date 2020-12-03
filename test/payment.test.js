import addValue from './add-value.js'
import click from './click.js'
import connectStripe from './connect-stripe.js'
import createProject from './create-project.js'
import login from './login.js'
import logout from './logout.js'
import server from './server.js'
import signup from './signup.js'
import tape from 'tape'
import timeout from './timeout.js'
import webdriver from './webdriver.js'

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

tape('declined cards', test => {
  const customerName = 'Jon Doe'
  const customerEMail = 'jon@exaple.com'
  const customerLocation = 'US-CA'
  server((port, done) => {
    (async () => {
      const browser = await webdriver()
      await signup({
        browser, port, name, location, handle, password, email
      })
      await login({ browser, port, handle, password })
      await connectStripe({ browser, port })
      // Confirm connected.
      const disconnect = await browser.$('#disconnect')
      const disconnectText = await disconnect.getText()
      test.equal(disconnectText, 'Disconnect Stripe Account', 'connected')
      await createProject({ browser, port, project, url, price, category })
      await logout({ browser, port })
      // Buy licenses.
      for await (const number of Object.keys(testNumbers)) {
        const groups = number.match(/.{2}/g)
        await browser.navigateTo(`http://localhost:${port}/~${handle}/${project}`)
        // Fill in customer details.
        await addValue(browser, '#buyForm input[name=name]', customerName)
        await addValue(browser, '#buyForm input[name=email]', customerEMail)
        await addValue(browser, '#buyForm input[name=location]', customerLocation)
        // Enter credit card information.
        const iframe = await browser.$('iframe')
        await browser.switchToFrame(iframe)
        const cardNumber = await browser.$('input[name="cardnumber"]')
        for await (const group of groups) {
          await cardNumber.addValue(group)
          await timeout(200)
        }
        const expiration = await browser.$('input[name="exp-date"]')
        await expiration.setValue('10 / 31')
        const cvc = await browser.$('input[name="cvc"]')
        await cvc.setValue('123')
        const postal = await browser.$('input[name="postal"]')
        await postal.setValue('12345')
        await browser.switchToParentFrame()
        // Accept terms.
        await click(browser, '#buyForm input[name=terms]')
        // Click the buy button.
        await click(browser, '#buyForm button[type=submit]')
        const error = await browser.$('.error')
        await error.waitForExist({ timeout: 10000 })
        const errorText = await error.getText()
        const watchWord = testNumbers[number]
        test.assert(errorText.includes(watchWord), `declined: ${watchWord}`)
      }
    })().then(finish).catch(finish)

    function finish (error) {
      test.ifError(error)
      test.end()
      done()
    }
  }, 8080)
})

tape('3D Secure card', test => {
  const customerName = 'Jon Doe'
  const customerEMail = 'jon@exaple.com'
  const customerLocation = 'US-CA'
  server((port, done) => {
    (async () => {
      const browser = await webdriver()
      await signup({
        browser, port, name, location, handle, password, email
      })
      await login({ browser, port, handle, password })
      await connectStripe({ browser, port })
      // Confirm connected.
      const disconnect = await browser.$('#disconnect')
      await disconnect.waitForExist({ timeout: 5000 })
      const disconnectText = await disconnect.getText()
      test.equal(disconnectText, 'Disconnect Stripe Account', 'connected')
      await createProject({ browser, port, project, url, price, category })
      await logout({ browser, port })
      // Buy licenses.
      const number = '4000000000003220'
      const groups = number.match(/.{2}/g)
      await browser.navigateTo(`http://localhost:${port}/~${handle}/${project}`)
      // Fill in customer details.
      await addValue(browser, '#buyForm input[name=name]', customerName)
      await addValue(browser, '#buyForm input[name=email]', customerEMail)
      await addValue(browser, '#buyForm input[name=location]', customerLocation)
      // Enter credit card information.
      const iframe = await browser.$('iframe')
      await browser.switchToFrame(iframe)
      const cardNumber = await browser.$('input[name="cardnumber"]')
      for await (const group of groups) {
        await cardNumber.addValue(group)
        await timeout(200)
      }
      const expiration = await browser.$('input[name="exp-date"]')
      await expiration.setValue('10 / 31')
      const cvc = await browser.$('input[name="cvc"]')
      await cvc.setValue('123')
      const postal = await browser.$('input[name="postal"]')
      await postal.setValue('12345')
      await browser.switchToParentFrame()
      // Accept terms.
      await click(browser, '#buyForm input[name=terms]')
      // Click the buy button.
      await click(browser, '#buyForm button[type=submit]')
      const message = await browser.$('.message')
      await message.waitForExist({ timeout: 10000 })
      const messageText = await message.getText()
      test.assert(messageText.includes('Thank you', 'confirmation'))
    })().then(finish).catch(finish)

    function finish (error) {
      test.ifError(error)
      test.end()
      done()
    }
  }, 8080)
})
