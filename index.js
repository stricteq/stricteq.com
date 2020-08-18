// HTTP Server Request Handler

const Busboy = require('busboy')
const FormData = require('form-data')
const URLRegEx = require('url-regex')
const cfCommonMark = require('commonform-commonmark')
const cfDOCX = require('commonform-docx')
const cfPrepareBlanks = require('commonform-prepare-blanks')
const commonformify = require('./commonformify')
const constants = require('./constants')
const cookie = require('cookie')
const crypto = require('crypto')
const csrf = require('./csrf')
const doNotCache = require('do-not-cache')
const docxToPDF = require('./docx-to-pdf')
const escapeHTML = require('escape-html')
const expired = require('./expired')
const fs = require('fs')
const gravatar = require('gravatar')
const grayMatter = require('gray-matter')
const html = require('./html')
const https = require('https')
const iso31662 = require('iso-3166-2')
const locations = require('./locations')
const mail = require('./mail')
const markdown = require('./markdown')
const notify = require('./notify')
const outlineNumbering = require('outline-numbering')
const parseJSON = require('json-parse-errback')
const parseURL = require('url-parse')
const passwordStorage = require('./password-storage')
const path = require('path')
const querystring = require('querystring')
const runAuto = require('run-auto')
const runParallel = require('run-parallel')
const runParallelLimit = require('run-parallel-limit')
const runSeries = require('run-series')
const send = require('send')
const signatures = require('./signatures')
const simpleConcatLimit = require('simple-concat-limit')
const storage = require('./storage')
const uuid = require('uuid')

// Read environment variables.
const environment = require('./environment')()
const stripe = require('stripe')(environment.STRIPE_SECRET_KEY)

// Router for a Few Authenticated Endpoints
const routes = require('http-hash')()
routes.set('/', serveHomepage)
routes.set('/signup', serveSignUp)
routes.set('/login', serveLogIn)
routes.set('/logout', serveLogOut)
routes.set('/create', serveCreate) // create projects
routes.set('/account', serveAccount) // account pages
routes.set('/handle', serveHandle) // remind of handles
routes.set('/email', serveEMail) // change account e-mail
routes.set('/profile', serveProfile) // change account info
// TODO: Add route for users to claim additional e-mail addresses.
routes.set('/password', servePassword) // change passwords
routes.set('/reset', serveReset) // reset passwords
routes.set('/confirm', serveConfirm) // confirm links in e-mails
routes.set('/connected', serveConnected) // confirm Stripe connected
routes.set('/disconnect', serveDisconnect) // disconnect Stripe
routes.set('/buy', serveBuy) // buy licenses

// Validation Rules for Account Names
const handles = (() => {
  const pattern = '[a-z0-9]{3,16}'
  const re = new RegExp(`^${pattern}$`)
  return {
    pattern,
    validate: string => re.test(string),
    html: 'Handles must be ' +
      'made of the characters ‘a’ through ‘z’ ' +
      'and the digits ‘0’ through ‘9’. ' +
      'They must be at least three characters long, ' +
      'but no more than sixteen.'
  }
})()

// Validation Rules for Project Names
const projects = (() => {
  const pattern = '[a-z0-9]{3,16}'
  const re = new RegExp(`^${pattern}$`)
  return {
    pattern,
    validate: string => re.test(string),
    html: 'Project names must be ' +
      'made of the characters ‘a’ through ‘z’ ' +
      'and the digits ‘0’ through ‘9’. ' +
      'They must be at least three characters long, ' +
      'but no more than sixteen.'
  }
})()

// Regular Expression For /~{handle} and /~{handle}/{project} Routing
const userPagePathRE = new RegExp(`^/~(${handles.pattern})$`)
const projectPagePathRE = new RegExp(`^/~(${handles.pattern})/(${projects.pattern})$`)

// Badges for Accounts
const accountBadges = [
  {
    key: 'award',
    display: 'Award',
    title: `This user has done special service to ${constants.website}.`,
    icon: 'award'
  },
  {
    key: 'verified',
    display: 'Verified',
    title: `${constants.website} has verified this user.`,
    icon: 'check-circle'
  },
  {
    key: 'vanguard',
    display: 'Vanguard',
    title: `This user was one of the first to sign up for ${constants.website}.`,
    icon: 'angle-double-up'
  }
]

// Badges for Projects
const projectBadges = [
  {
    key: 'featured',
    display: 'Features',
    title: `This project has been featured on ${constants.website}.`,
    icon: 'bullhorn'
  },
  {
    key: 'seedling',
    display: 'Seedling',
    title: `This project pays the miminum to ${constants.website} for each sale.`,
    icon: 'seedling'
  }
]

// Logos of Various Websites
// These are used to decorate hyperlink.
const hostLogos = [
  { icon: 'twitter', hostname: 'twitter.com' },
  { icon: 'github', hostname: 'github.com' },
  { icon: 'gitlab', hostname: 'gitlab.com' }
]

// Master List of Icons
const icons = []
  .concat(accountBadges.map(badge => badge.icon))
  .concat(projectBadges.map(badge => badge.icon))
  .concat(hostLogos.map(host => host.icon))
  .concat('user')

const staticFiles = [
  'styles.css',
  'normalize.css',
  'credits.txt',
  // TODO: Relaxe robots.txt.
  'robots.txt',
  'logo.svg',
  'logo-on-white-100.png',
  'buy.js'
]

// Function for http.createServer()
module.exports = (request, response) => {
  const parsed = request.parsed = parseURL(request.url, true)
  const pathname = parsed.pathname
  // Try autenticated routes.
  const { handler, params } = routes.get(pathname)
  if (handler) {
    request.parameters = params
    return authenticate(request, response, () => {
      handler(request, response)
    })
  }
  // Terms
  if (pathname === '/service') {
    return serveTerms(request, response, 'service')
  }
  if (pathname === '/agency') {
    return serveTerms(request, response, 'agency')
  }
  if (pathname === '/privacy') {
    return serveTerms(request, response, 'privacy')
  }
  if (pathname === '/free') {
    return serveTerms(request, response, 'free')
  }
  if (pathname === '/paid') {
    return serveTerms(request, response, 'paid')
  }
  if (pathname === '/deal') {
    return serveTerms(request, response, 'deal')
  }
  // Static Files
  const basename = path.basename(pathname)
  if (staticFiles.includes(basename)) {
    return serveFile(request, response, basename)
  }
  // Icon SVGs
  for (let index = 0; index < icons.length; index++) {
    const icon = icons[index]
    if (pathname === `/${icon}.svg`) {
      const file = path.join('icons', `${icon}.svg`)
      return serveFile(request, response, file)
    }
  }
  if (pathname === '/public-key') {
    response.setHeader('Content-Type', 'application/octet-stream')
    return response.end(process.env.PUBLIC_KEY)
  }
  if (pathname === '/stripe-webhook') return serveStripeWebhook(request, response)
  // Testing-Only Routes
  if (pathname === '/internal-error' && !environment.production) {
    return serve500(request, response, new Error('test error'))
  }
  if (pathname === '/badges' && !environment.production) {
    return serveBadges(request, response)
  }
  // Account and Project Routes
  // /~{handle}
  let match = userPagePathRE.exec(pathname)
  if (match) {
    request.parameters = {
      handle: match[1]
    }
    return authenticate(request, response, () => {
      serveUserPage(request, response)
    })
  }
  // /~{handle}/{project}
  match = projectPagePathRE.exec(pathname)
  if (match) {
    request.parameters = {
      handle: match[1],
      project: match[2]
    }
    return authenticate(request, response, () => {
      serveProjectPage(request, response)
    })
  }
  // Default
  serve404(request, response)
}

// Partials

const meta = function ({ title }) {
  return html`
<meta charset=UTF-8>
<meta name=viewport content="width=device-width, initial-scale=1">
<meta name="description" content="${constants.slogan}">
<meta name="twitter:card" content="summary">
<meta name="twitter:description" content="${constants.slogan}">
<meta name="twitter:image" content="${process.env.BASE_HREF}/logo-on-white-100.png">
<meta name="twitter:site" content="@${constants.twitter}">
<meta name="twitter:title" content="${title || constants.website}">
<meta name="og:type" content="website">
<meta name="og:title" content="${title || constants.website}">
<meta name="og:description" content="${constants.slogan}">
<meta name="og:image" content="${process.env.BASE_HREF}/logo-on-white-100.png">
<meta name="og:site" content="stricteq">
<link href=/normalize.css rel=stylesheet>
<link href=/styles.css rel=stylesheet>
  `
}

const header = `
<header role=banner>
  <a href=/><img src=/logo.svg id=logo alt=logo></a>
  <h1>${constants.website}</h1>
  <p class=slogan>${escapeHTML(constants.slogan)}</p>
  </header>
`

const footer = `
<footer role=contentinfo>
  <a class=spaced href=https://artlessdevices.com>Company</a>
  <a class=spaced href=/service>Terms of Service</a>
  <a class=spaced href=/agency>Agency Terms</a>
  <a class=spaced href=/privacy>Privacy</a>
  <a class=spaced href=mailto:support@stricteq.com>Support</a>
  <a class=spaced href=https://twitter.com/${constants.twitter}>Twitter</a>
  <p>Built on <a href=/credits.txt>open code</a>. Source <a href=https://github.com/stricteq/stricteq.com>on GitHub</a>.</p>
  <p>
    Icons by <a href=https://fontawesome.com>Font Awesome</a>
    under <a href=https://creativecommons.org/licenses/by/4.0/>CC-BY-4.0</a>.
  </p>
  </section>
</footer>
`

function nav (request) {
  const account = request.account
  const handle = account && account.handle
  return html`
<nav role=navigation>
  ${!handle && '<a id=login class=spaced href=/login>Log In</a>'}
  ${!handle && '<a id=signup class=spaced href=/signup>Sign Up</a>'}
  ${handle && `<a id=profile class=spaced href=/~${handle}>${handle}</a>`}
  ${handle && '<a id=account class=spaced href=/account>Account</a>'}
  ${handle && logoutButton(request)}
</nav>
  `
}

function logoutButton (request) {
  const csrfInputs = csrf.inputs({
    action: '/logout',
    sessionID: request.session.id
  })
  return html`
<form id=logoutForm action=/logout method=post>
  ${csrfInputs}
  <button id=logout type=submit>Log Out</button>
</form>
  `
}

// Routes

function serveHomepage (request, response) {
  if (request.method !== 'GET') return serve405(request, response)
  doNotCache(response)
  runParallel({
    showcase: done => {
      storage.showcase.read('homepage', (error, entries) => {
        if (error) return done(error)
        runParallel((entries || []).map(entry => {
          const name = `${entry.handle}/${entry.project}`
          return done => storage.project.read(name, done)
        }), done)
      })
    }
  }, (error, data) => {
    if (error) return serve500(request, response, error)
    response.setHeader('Content-Type', 'text/html')
    response.end(html`
<!doctype html>
<html lang=en-US>
  <head>
    ${meta({})}
    <title>${constants.website}</title>
  </head>
  <body>
    ${nav(request)}
    ${header}
    <main role=main>
      <p>
        ${constants.website} is a simple, open catalog of user-supported software.
      </p>
      <p>
        All ${constants.website} software is available under a <a href=/deal>standard deal</a>.
        If you use the software to make money or for work, buy a license from the developer.
        Otherwise, you’re free to use and share for free.
        And to offer the same deal for your own software.
      </p>
      <ol class=showcase>
        ${(data.showcase || []).map(entry => html`
        <li>
          <a href=/~${entry.handle}/${entry.project}
            >${entry.project}</a>
          <a href=/~${entry.handle}>${entry.handle}</a>
          <span class=category>${entry.category}</span>
          <span class=currency>$${entry.price.toString()}</span>
          ${badgesList(entry)}
        </li>
        `)}
      </ol>
    </main>
    ${footer}
  </body>
</html>
    `)
  })
}

function serveFile (request, response, file) {
  send(request, path.join(__dirname, file)).pipe(response)
}

function serveTerms (request, response, slug) {
  fs.readFile(
    path.join(__dirname, 'terms', `${slug}.md`),
    'utf8',
    (error, read) => {
      if (error) return serve500(request, response, error)
      const { content, data: { title, version } } = grayMatter(read)
      response.setHeader('Content-Type', 'text/html')
      response.end(html`
<!doctype html>
<html lang=en-US>
  <head>
    ${meta({ title })}
    <title>${escapeHTML(title)}</title>
  </head>
  <body>
    ${nav(request)}
    ${header}
    <main role=main>
      <h1>${escapeHTML(title)}</h1>
      ${version && `<p class=version>Version ${version}</p>`}
      ${markdown(content)}
    </main>
    ${footer}
  </body>
</html>
      `)
    }
  )
}

// https://html.spec.whatwg.org/multipage/input.html#valid-e-mail-address
const EMAIL_RE = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/

const UUID_RE = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/

// Validation Rules for Passwords
const passwords = (() => {
  const min = 8
  const max = 64
  const pattern = exports.pattern = `.{${min},${max}}`
  const re = new RegExp(`^${pattern}$`)
  return {
    pattern,
    validate: string => {
      if (!re.test(string)) return false
      const length = string.length
      return length >= min && length <= max
    },
    html: 'Passwords must be ' +
      `at least ${min} characters, ` +
      `and no more than ${max}.`
  }
})()

const nameField = {
  displayName: 'name',
  filter: e => e.trim(),
  validate: e => e.length >= 3
}

const locationField = {
  displayName: 'location',
  filter: e => e.toUpperCase().trim(),
  validate: code => locations.includes(code)
}

function serveSignUp (request, response) {
  const title = 'Sign Up'

  const fields = {
    name: nameField,
    location: locationField,
    email: {
      displayName: 'e-mail address',
      filter: e => e.toLowerCase().trim(),
      validate: e => EMAIL_RE.test(e)
    },
    handle: {
      displayName: 'handle',
      filter: e => e.toLowerCase().trim(),
      validate: handles.validate
    },
    password: {
      display: 'password',
      validate: passwords.validate
    },
    repeat: {
      display: 'password repeat',
      validate: (value, body) => value === body.password
    }
  }

  formRoute({
    action: '/signup',
    form,
    fields,
    processBody,
    onSuccess
  })(request, response)

  function processBody (request, body, done) {
    const { handle, email, password, name, location } = body
    runSeries([
      // Check if e-mail already used.
      done => {
        storage.email.read(email, (error, record) => {
          if (error) return done(error)
          if (!record) return done()
          const hasAccount = new Error('e-mail address has an account')
          hasAccount.hasAccount = true
          hasAccount.statusCode = 401
          hasAccount.fieldName = 'email'
          done(hasAccount)
        })
      },

      // Write the account record.
      done => {
        passwordStorage.hash(password, (error, passwordHash) => {
          if (error) return done(error)
          runSeries([
            done => {
              storage.account.create(handle, {
                handle,
                email,
                passwordHash,
                name,
                location,
                urls: [],
                badges: {},
                projects: [],
                affiliations: '',
                created: new Date().toISOString(),
                confirmed: false,
                failures: 0,
                stripe: {
                  connected: false,
                  connectNonce: randomNonce()
                },
                locked: false
              }, (error, success) => {
                if (error) return done(error)
                if (!success) {
                  const error = new Error('handle taken')
                  error.handle = handle
                  error.statusCode = 400
                  return done(error)
                }
                done()
              })
            },
            done => {
              const data = { handle }
              storage.email.update(email, data, (error, updated) => {
                if (error) return done(error)
                if (!updated) {
                  data.orderIDs = []
                  return storage.email.create(email, data, done)
                }
                done()
              })
            }
          ], (error, success) => {
            if (error) return done(error)
            request.log.info('recorded account')
            done()
          })
        })
      },

      // Create an e-mail confirmation token.
      done => {
        const token = uuid.v4()
        storage.token.create(token, {
          action: 'confirm e-mail',
          created: new Date().toISOString(),
          handle,
          email
        }, error => {
          if (error) return done(error)
          request.log.info('recorded token')
          notify.confirmEMail({
            to: email,
            handle,
            url: `${process.env.BASE_HREF}/confirm?token=${token}`
          }, error => {
            if (error) return done(error)
            request.log.info('e-mailed token')
            done()
          })
        })
      },

      // Notify the administrator.
      done => {
        if (!process.env.ADMIN_EMAIL) return done()
        mail({
          to: process.env.ADMIN_EMAIL,
          subject: 'Sign Up',
          text: [
            `Name: ${name}`,
            `E-Mail: ${email}`,
            `Handle: ${handle}`,
            `Location: ${location} (${iso3166ToEnglish(location)})`
          ].join('\n\n')
        }, error => {
          // Eat errors.
          if (error) request.log.error(error)
          done()
        })
      }
    ], done)
  }

  function onSuccess (request, response) {
    response.setHeader('Content-Type', 'text/html')
    response.end(html`
<!doctype html>
<html lang=en-US>
  <head>
    ${meta({})}
    <title>${title}</title>
  </head>
  <body>
    ${nav(request)}
    ${header}
    <main role=main>
      <h2>Success</h2>
      <p class=message>Check your e-mail for a link to confirm your new account.</p>
    </main>
    ${footer}
  </body>
</html>
  `)
  }

  function form (request, data) {
    response.setHeader('Content-Type', 'text/html')
    response.end(html`
<!doctype html>
<html lang=en-US>
  <head>
    ${meta({})}
    <title>${title}</title>
  </head>
  <body>
    ${nav(request)}
    ${header}
    <main role=main>
      <h2>${title}</h2>
      <p>Sign up for a ${constants.website} account to track your purchases and offer projects for sale.</p>
      <form id=signupForm method=post>
        ${data.error}
        ${data.csrf}
        ${nameInput({ value: data.name.value, autofocus: true })}
        ${data.name.error}
        ${locationInput(data.location.value)}
        ${data.location.error}
        ${eMailInput({
          autofocus: true,
          value: data.email.value
        })}
        ${data.email.error}
        <p>
          <label for=handle>Handle</label>
          <input
              name=handle
              type=text
              placeholder=charlie5
              pattern="^${handles.pattern}$"
              value="${escapeHTML(data.handle.value || '')}"
              required>
        </p>
        <p>Your callsign on ${constants.website}. Your profile page will be ${process.env.BASE_HREF}/~{handle}.</p>
        <p>${handles.html}</p>
        <p>Please respect others who have registered a particular handle in several other places, like Twitter, GitHub, npm, and so on. In general, handles are first-come, first-served. But ${constants.website} may require changes to avoid confusion.</p>
        ${data.handle.error}
        ${passwordInput({})}
        ${data.password.error}
        ${passwordRepeatInput()}
        ${data.repeat.error}
        <p>Please pick a strong password or passphrase just for ${constants.website}. ${constants.website} does <em>not</em> yet support two-factor authentication.</p>
        <p>${escapeHTML(passwords.html)}</p>
        <button type=submit>${title}</button>
      </form>
    </main>
    ${footer}
  </body>
</html>
    `)
  }
}

function randomNonce () {
  return crypto.randomBytes(32).toString('hex')
}

// Project Price Constraints
const MINIMUM_PRICE = 3
const MAXIMUM_PRICE = 9999

// Categories for Projects
const projectCategories = [
  'application',
  'plugin',
  'library',
  'framework',
  'service',
  'development tool',
  'operating system',
  'interpreter'
]

const urlField = {
  displayName: 'URL',
  filter: e => e.trim(),
  validate: e => e.length < 128 && URLRegEx({
    exact: true,
    strict: true
  }).test(e)
}

function serveCreate (request, response) {
  const title = 'Create Project'

  const fields = {
    project: {
      display: 'project name',
      filter: e => e.toLowerCase().trim(),
      validate: projects.validate
    },
    url: urlField,
    price: {
      displayName: 'price',
      filter: e => parseInt(e),
      validate: e => !isNaN(e) && e >= MINIMUM_PRICE
    },
    category: {
      displayName: 'category',
      filter: e => e.toLowerCase().trim(),
      validate: e => projectCategories.includes(e)
    }
  }

  formRoute({
    action: '/create',
    requireAuthentication: true,
    form,
    fields,
    processBody,
    onSuccess
  })(request, response)

  function processBody (request, body, done) {
    const handle = request.account.handle
    const { project, url, price, category } = body
    const slug = `${handle}/${project}`
    const created = new Date().toISOString()
    runSeries([
      done => storage.project.create(slug, {
        project,
        handle,
        urls: [url],
        price,
        commission: process.env.MINIMUM_COMMISSION,
        customers: [],
        badges: {},
        category,
        created
      }, (error, success) => {
        if (error) return done(error)
        if (!success) {
          const error = new Error('project nmame taken')
          error.statusCode = 400
          return done(error)
        }
        done()
      }),
      done => storage.account.update(handle, (data, done) => {
        data.projects.push({ project, created })
        done()
      }, done)
    ], done)
  }

  function onSuccess (request, response, body) {
    const slug = `${request.account.handle}/${body.project}`
    serve303(request, response, `/~${slug}`)
  }

  function form (request, data) {
    response.setHeader('Content-Type', 'text/html')
    response.end(html`
<!doctype html>
<html lang=en-US>
  <head>
    ${meta({})}
    <title>${title}</title>
  </head>
  <body>
    ${nav(request)}
    ${header}
    <main role=main>
      <h2>${title}</h2>
      <form id=createForm method=post>
        ${data.error}
        ${data.csrf}
        ${data.project.error}
        <p>
          <label for=project>Project Name</label>
          <input
              name=project
              type=text
              pattern="^${projects.pattern}$"
              value="${escapeHTML(data.project.value || '')}"
              autofocus
              required>
        </p>
        <p>Your project’s page will be ${process.env.BASE_HREF}/~${request.account.handle}/{name}.</p>
        ${urlInput({ value: data.project.url, required: true })}
        <p>URL for your project, such as a homepage or source code repository.</p>
        <p>
          <label for=category>Category</label>
          <select
              name=category
              required>
            ${projectCategories.map(c => `<option value="${c}">${c}</option>`)}
          </select>
        </p>
        <p>
          <label for=price>Price</label>
          <input
            name=price
            type=number
            value="${escapeHTML(data.project.price || '')}"
            min="${MINIMUM_PRICE.toString()}"
            min="${MAXIMUM_PRICE.toString()}"
            required>
        </p>
        <p>Cost of <a href=/paid>a license</a> in United States Dollars.</p>
        <button type=submit>${title}</button>
      </form>
    </main>
    ${footer}
  </body>
</html>
    `)
  }
}

function serveLogIn (request, response) {
  const title = 'Log In'

  const fields = {
    handle: {
      displayName: 'handle',
      filter: e => e.toLowerCase().trim(),
      validate: x => x.length !== 0
    },
    password: {
      validate: x => x.length !== 0
    }
  }

  module.exports = formRoute({
    action: '/login',
    form,
    fields,
    processBody,
    onSuccess
  })(request, response)

  function form (request, data) {
    return html`
<!doctype html>
<html lang=en-US>
  <head>
    ${meta({})}
    <title>${title}</title>
  </head>
  <body>
    ${nav(request)}
    ${header}
    <main role=main>
      <h2>${title}</h2>
      <form id=loginForm method=post>
        ${data.error}
        ${data.csrf}
        <p>
          <label for=handle>Handle</label>
          <input name=handle type=text required autofocus>
        </p>
        ${data.handle.error}
        <p>
          <label for=password>Password</label>
          <input name=password type=password required>
        </p>
        ${data.password.error}
        <button type=submit>${title}</button>
      </form>
      <a class=spaced href=/handle>Forgot Handle</a>
      <a class=spaced href=/reset>Reset Password</a>
    </main>
    ${footer}
  </body>
</html>
    `
  }

  function processBody (request, body, done) {
    const { handle, password } = body

    let sessionID
    runSeries([
      authenticate,
      createSession
    ], error => {
      if (error) return done(error)
      done(null, sessionID)
    })

    function authenticate (done) {
      passwordStorage.verify(handle, password, (verifyError, account) => {
        if (verifyError) {
          const statusCode = verifyError.statusCode
          if (statusCode === 500) return done(verifyError)
          if (!account) return done(verifyError)
          request.log.info(verifyError, 'authentication error')
          const failures = account.failures + 1
          if (failures >= 5) {
            return storage.account.update(handle, {
              locked: new Date().toISOString(),
              failures: 0
            }, recordError => {
              if (recordError) return done(recordError)
              done(verifyError)
            })
          }
          return storage.account.update(
            handle, { failures },
            updateError => {
              if (updateError) return done(updateError)
              done(verifyError)
            }
          )
        }
        request.log.info('verified credentials')
        done()
      })
    }

    function createSession (done) {
      sessionID = uuid.v4()
      storage.session.create(sessionID, {
        id: sessionID,
        handle,
        created: new Date().toISOString()
      }, (error, success) => {
        if (error) return done(error)
        if (!success) return done(new Error('session collision'))
        request.log.info({ id: sessionID }, 'recorded session')
        done()
      })
    }
  }

  function onSuccess (request, response, body, sessionID) {
    const expires = new Date(
      Date.now() + (30 * 24 * 60 * 60 * 1000) // thirty days
    )
    setCookie(response, sessionID, expires)
    request.log.info({ expires }, 'set cookie')
    serve303(request, response, '/')
  }
}

function serveLogOut (request, response) {
  if (request.method !== 'POST') {
    return serve405(request, response)
  }
  parseAndValidatePostBody({ action: '/logout', request }, error => {
    if (error) return redirect()
    clearCookie(response)
    redirect()
  })

  function redirect () {
    response.statusCode = 303
    response.setHeader('Location', '/')
    response.end()
  }
}

function serveAccount (request, response) {
  if (request.method !== 'GET') return serve405(request, response)
  const account = request.account
  if (!account) return serve302(request, response, '/login')
  response.setHeader('Content-Type', 'text/html')
  response.end(html`
<!doctype html>
<html lang=en-US>
  <head>
    ${meta({})}
    <title>Account</title>
  </head>
  <body>
    ${nav(request)}
    ${header}
    <main role=main>
      <h2>Account</h2>
      <p class=joined>Joined ${escapeHTML(account.created)}</p>
      ${account.stripe.connected ? disconnectLink() : connectLink()}
      <a class=spaced href=/create>Create Project</a>
      <a class=spaced href=/password>Change Password</a>
      <a class=spaced href=/email>Change E-Mail</a>
      <a class=spaced href=/profile>Change Profile</a>
    </main>
    ${footer}
  </body>
</html>
  `)

  function disconnectLink () {
    const action = '/disconnect'
    const csrfInputs = csrf.inputs({
      action, sessionID: request.session.id
    })
    return html`
<form id=disconnectForm action=${action} method=post>
  ${csrfInputs}
  <button id=disconnect type=submit>Disconnect Stripe Account</button>
</form>
    `
  }

  function connectLink () {
    const url = 'https://connect.stripe.com/oauth/authorize?' +
      querystring.stringify({
        response_type: 'code',
        client_id: environment.STRIPE_CLIENT_ID,
        scope: 'read_write',
        state: account.stripe.connectNonce,
        redirect_uri: `${process.env.BASE_HREF}/connected`
      })
    return `<a id=connect href="${url}">Connect Stripe Account</a>`
  }
}

function serveHandle (request, response) {
  const title = 'Forgot Handle'

  const fields = {
    email: {
      displayName: 'e-mail address',
      filter: e => e.toLowerCase().trim(),
      validate: e => EMAIL_RE.test(e)
    }
  }

  formRoute({
    action: '/handle',
    form,
    fields,
    processBody,
    onSuccess
  })(request, response)

  function form (request, data) {
    return html`
<!doctype html>
<html lang=en-US>
  <head>
    ${meta({})}
    <title>${title}</title>
  </head>
  <body>
    ${nav(request)}
    ${header}
    <main role=main>
      <h2>${title}</h2>
      <form id=handleForm method=post>
        ${data.error}
        ${data.csrf}
        <p>
          <label for=email>E-Mail</label>
          <input
              name=email
              type=email
              required
              autofocus
              autocomplete=off>
        </p>
        ${data.email.error}
        <button type=submit>Send Handle</button>
      </form>
    </main>
    ${footer}
  </body>
</html>
    `
  }

  function onSuccess (request, response, body) {
    response.setHeader('Content-Type', 'text/html')
    response.end(html`
<!doctype html>
<html lang=en-US>
  <head>
    ${meta({})}
    <title>${title}</title>
  </head>
  <body>
    ${nav(request)}
    ${header}
    <main role=main>
      <h2>${title}</h2>
      <p class=message>If the e-mail you entered corresponds to an account, an e-mail was just sent to it.</p>
    </main>
    ${footer}
  </body>
</html>
    `)
  }

  function processBody (request, body, done) {
    const email = body.email
    storage.email.read(email, (error, record) => {
      if (error) return done(error)
      if (!record) return done()
      notify.handleReminder({
        to: email,
        handle: record.handle
      }, done)
    })
  }
}

function serveEMail (request, response) {
  const title = 'Change E-Mail'

  const fields = {
    email: {
      displayName: 'e-mail address',
      filter: e => e.toLowerCase().trim(),
      validate: e => EMAIL_RE.test(e)
    }
  }

  formRoute({
    action: '/email',
    requireAuthentication: true,
    form,
    fields,
    processBody,
    onSuccess
  })(request, response)

  function form (request, data) {
    return html`
<!doctype html>
<html lang=en-US>
  <head>
    ${meta({})}
    <title>${title}</title>
  </head>
  <body>
    ${nav(request)}
    ${header}
    <main role=main>
      <h2>${title}</h2>
      <form id=emailForm method=post>
        ${data.error}
        ${data.csrf}
        ${eMailInput({ autofocus: true })}
        ${data.email.error}
        <button type=submit>${title}</button>
      </form>
    </main>
    ${footer}
  </body>
</html>
    `
  }

  function onSuccess (request, response, body) {
    response.setHeader('Content-Type', 'text/html')
    response.end(html`
<!doctype html>
<html lang=en-US>
  <head>
    ${meta({})}
    <title>${title}</title>
  </head>
  <body>
    ${nav(request)}
    ${header}
    <main role=main>
      <h2>${title}</h2>
      <p class=message>Confirmation e-mail sent.</p>
    </main>
    ${footer}
  </body>
</html>
    `)
  }

  function processBody (request, body, done) {
    const handle = request.account.handle
    const email = body.email
    storage.email.read(email, (error, record) => {
      if (error) return done(error)
      if (record) {
        const error = new Error('e-mail already has an account')
        error.fieldName = 'email'
        error.statusCode = 400
        return done(error)
      }
      const token = uuid.v4()
      storage.token.create(token, {
        action: 'change e-mail',
        created: new Date().toISOString(),
        handle,
        email
      }, error => {
        if (error) return done(error)
        request.log.info({ token }, 'e-mail change token')
        notify.changeEMail({
          to: email,
          url: `${process.env.BASE_HREF}/confirm?token=${token}`
        }, done)
      })
    })
  }
}

const affiliations = (() => {
  const pattern = '.{3,256}'
  const re = new RegExp(`^${pattern}$`)
  return {
    pattern,
    validate: string => re.test(string),
    html: 'Affiliations are lists of companies and other organizations you belong to, up to 256 characters long.'
  }
})()

function serveProfile (request, response) {
  const title = 'Change Profile'

  const fields = {
    name: nameField,
    location: locationField,
    affiliations: {
      displayName: 'affiliations',
      filter: e => e.trim(),
      validate: affiliations.validate
    },
    url: urlField
  }

  formRoute({
    action: '/profile',
    requireAuthentication: true,
    loadGETData,
    form,
    fields,
    processBody,
    onSuccess
  })(request, response)

  function processBody (request, body, done) {
    const handle = request.account.handle
    runSeries([
      done => storage.account.read(handle, (error, account) => {
        if (error) return done(error)
        if (!account) return done(new Error('no account record'))
        if (account.badges.verified) {
          var verifiedError = new Error('verified account')
          verifiedError.statusCode = 400
          return done(verifiedError)
        }
        done()
      }),
      done => storage.account.update(handle, {
        name: body.name,
        location: body.location,
        affiliations: body.affiliations,
        urls: [body.url]
      }, done)
    ], done)
  }

  function onSuccess (request, response, body) {
    serve303(request, response, `/~${request.account.handle}`)
  }

  function loadGETData (request, data, done) {
    const handle = request.account.handle
    storage.account.read(handle, (error, account) => {
      if (error) return done(error)
      if (!account) {
        var notFound = new Error('account not found')
        notFound.statusCode = 404
        return done(error)
      }
      if (account.badges.verified) data.verified = true
      const fields = ['name', 'location', 'affiliations']
      fields.forEach(field => {
        data[field] = { value: account[field] }
      })
      if (account.urls[0]) data.url = { value: account.urls[0] }
      done()
    })
  }

  function form (request, data) {
    response.setHeader('Content-Type', 'text/html')
    response.write(html`
<!doctype html>
<html lang=en-US>
  <head>
    ${meta({})}
    <title>${title}</title>
  </head>
  <body>
    ${nav(request)}
    ${header}
    <main role=main>
      <h2>${title}</h2>
    `)
    if (data.verified) {
      response.write(html`
      <p>
        Your profile information is locked because your account is verified.
        Please <a href=mailto:support@stricteq.com>e-mail us</a> about the changes you’d like to make.
      </p>
      `)
    } else {
      response.write(html`
      <form id=profileForm method=post>
        ${data.error}
        ${data.csrf}
        ${nameInput({ value: data.name.value, autofocus: true })}
        ${data.name.error}
        ${locationInput(data.location.value)}
        ${data.location.error}
        <p>
          <label for=affiliations>Affiliations</label>
          <input
              name=affiliations
              type=text
              pattern="^${affiliations.pattern}$"
              value="${escapeHTML(data.affiliations.value)}">
        </p>
        ${data.affiliations.error}
        <p>${affiliations.html}</p>
        ${urlInput({ value: data.url.value, required: false })}
        ${data.url.error}
        <button type=submit>${title}</button>
      </form>
      `)
    }
    response.end(html`
    </main>
    ${footer}
  </body>
</html>
    `)
  }
}

function servePassword (request, response) {
  const method = request.method
  if (method === 'GET') return getPassword(request, response)
  if (method === 'POST') return postPassword(request, response)
  response.statusCode = 405
  response.end()
}

function getPassword (request, response) {
  if (request.parsed.query.token) return getWithToken(request, response)
  getAuthenticated(request, response)
}

function getAuthenticated (request, response) {
  const handle = request.account && request.account.handle
  if (!handle) {
    response.statusCode = 401
    response.end()
    return
  }
  const title = 'Change Password'
  const message = request.parsed.query.message
  const messageParagraph = message
    ? `<p class=message>${escapeHTML(message)}</p>`
    : ''
  response.setHeader('Content-Type', 'text/html')
  response.end(html`
<!doctype html>
<html lang=en-US>
  <head>
    ${meta({})}
    <title>${title}</title>
  </head>
  <body>
    ${nav(request)}
    ${header}
    <main role=main>
      <h2>${title}</h2>
      ${messageParagraph}
      <form id=passwordForm method=post>
        ${csrf.inputs({
          action: '/password',
          sessionID: request.session.id
        })}
        <p>
          <label for=old>Old Password</label>
          <input name=old type=password required autofocus autocomplete=off>
        </p>
        ${passwordInput({ label: 'New Password' })}
        ${passwordRepeatInput()}
        <button type=submit>${title}</button>
      </form>
    </main>
    ${footer}
  </body>
</html>
  `)
}

function getWithToken (request, response) {
  const token = request.parsed.query.token
  if (!UUID_RE.test(token)) {
    return invalidToken(request, response)
  }
  storage.token.read(token, (error, tokenData) => {
    if (error) return serve500(request, response, error)
    if (!tokenData) return invalidToken(request, response)
    if (
      tokenData.action !== 'reset password' ||
      expired.token(tokenData)
    ) {
      response.statusCode = 400
      return response.end()
    }
    const title = 'Change Password'
    const message = request.parsed.query.message || error
    const messageParagraph = message
      ? `<p class=message>${escapeHTML(message)}</p>`
      : ''
    response.setHeader('Content-Type', 'text/html')
    response.end(html`
<!doctype html>
<html lang=en-US>
  <head>
    ${meta({})}
    <title>${title}</title>
  </head>
  <body>
    ${nav(request)}
    ${header}
    <main role=main>
      <h2>${title}</h2>
      ${messageParagraph}
      <form id=passwordForm method=post>
        ${csrf.inputs({
          action: '/password',
          sessionID: request.session.id
        })}
        <input type=hidden name=token value="${token}">
        ${passwordInput({
          label: 'New Password',
          autofocus: true
        })}
        ${passwordRepeatInput()}
        <button type=submit>${title}</button>
      </form>
    </main>
    ${footer}
  </body>
</html>
    `)
  })
}

function invalidToken (request, response) {
  const title = 'Change Password'
  response.statusCode = 400
  response.setHeader('Content-Type', 'text/html')
  return response.end(html`
<!doctype html>
<html lang=en-US>
  <head>
    ${meta({})}
    <title>${title}</title>
  </head>
  <body>
    ${nav(request)}
    ${header}
    <main role=main>
      <h2>${title}</h2>
      <p class=message>The link you followed is invalid or expired.</p>
    </main>
    ${footer}
  </body>
</html>
  `)
}

function postPassword (request, response) {
  let handle, body
  runSeries([
    done => parseAndValidatePostBody({
      action: '/password',
      request,
      fields: {
        password: {
          displayName: 'password',
          validate: passwords.validate
        },
        repeat: {
          displayName: 'password repeat',
          validate: (value, body) => value === body.password
        },
        token: {
          displayName: 'token',
          optional: true,
          validate: value => UUID_RE.test(value)
        },
        old: {
          displayName: 'old password',
          optional: true,
          validate: passwords.validate
        }
      }
    }, (error, result) => {
      if (error) return done(error)
      body = result
      done()
    }),
    checkOldPassword,
    changePassword,
    sendEMail
  ], function (error) {
    if (error) {
      if (error.statusCode === 400) {
        response.statusCode = 400
        return getPassword(request, response, error.message)
      }
      request.log.error(error)
      response.statusCode = error.statusCode || 500
      return response.end()
    }
    const title = 'Change Password'
    response.setHeader('Content-Type', 'text/html')
    response.end(html`
<!doctype html>
<html lang=en-US>
  <head>
    ${meta({})}
    <title>${title}</title>
  </head>
  <body>
    ${nav(request)}
    ${header}
    <main role=main>
      <h2>${title}</h2>
      <p class=message>Password changed.</p>
    </main>
    ${footer}
  </body>
</html>
    `)
  })

  function checkOldPassword (done) {
    const token = body.token
    if (token) return done()
    if (!request.account) {
      const unauthorized = new Error('unauthorized')
      unauthorized.statusCode = 401
      return done(unauthorized)
    }
    handle = request.account.handle
    passwordStorage.verify(handle, body.old, error => {
      if (error) {
        const invalidOldPassword = new Error('invalid password')
        invalidOldPassword.statusCode = 400
        return done(invalidOldPassword)
      }
      return done()
    })
  }

  function changePassword (done) {
    const token = body.token
    if (token) {
      return storage.token.read(token, (error, tokenData) => {
        if (error) return done(error)
        if (
          !tokenData ||
          tokenData.action !== 'reset password' ||
          expired.token(tokenData)
        ) {
          const failed = new Error('invalid token')
          failed.statusCode = 401
          return done(failed)
        }
        storage.token.use(token, error => {
          if (error) return done(error)
          handle = tokenData.handle
          recordChange()
        })
      })
    }

    recordChange()

    function recordChange () {
      passwordStorage.hash(body.password, (error, passwordHash) => {
        if (error) return done(error)
        storage.account.update(handle, { passwordHash }, done)
      })
    }
  }

  function sendEMail (done) {
    storage.account.read(handle, (error, account) => {
      if (error) return done(error)
      notify.passwordChanged({
        to: account.email,
        handle
      }, error => {
        // Log and eat errors.
        if (error) request.log.error(error)
        done()
      })
    })
  }
}

function serveReset (request, response) {
  const title = 'Reset Password'

  const fields = {
    handle: {
      displayName: 'handle',
      validate: handles.validate
    }
  }

  formRoute({
    action: '/reset',
    form,
    fields,
    processBody,
    onSuccess
  })(request, response)

  function form (request, data) {
    return html`
<!doctype html>
<html lang=en-US>
  <head>
    ${meta({})}
    <title>${title}</title>
  </head>
  <body>
    ${nav(request)}
    ${header}
    <main role=main>
      <h2>${title}</h2>
      <form id=resetForm method=post>
        ${data.error}
        ${data.csrf}
        <p>
          <label for=handle>Handle</label>
          <input
              name=handle
              type=text
              value="${escapeHTML(data.handle.value)}"
              pattern="^${handles.pattern}$"
              required
              autofocus
              autocomplete=off>
        </p>
        ${data.handle.error}
        <button type=submit>Send E-Mail</button>
      </form>
    </main>
    ${footer}
  </body>
</html>
    `
  }

  function processBody (request, body, done) {
    const handle = body.handle
    storage.account.read(handle, (error, account) => {
      if (error) return done(error)
      if (!account) {
        const invalid = new Error('invalid handle')
        invalid.statusCode = 400
        return done(invalid)
      }
      const token = uuid.v4()
      storage.token.create(token, {
        action: 'reset password',
        created: new Date().toISOString(),
        handle
      }, error => {
        if (error) return done(error)
        const url = `${process.env.BASE_HREF}/password?token=${token}`
        notify.passwordReset({
          to: account.email,
          handle,
          url
        }, done)
      })
    })
  }

  function onSuccess (request, response) {
    response.setHeader('Content-Type', 'text/html')
    response.end(html`
<!doctype html>
<html lang=en-US>
  <head>
    ${meta({})}
    <title>${title}</title>
  </head>
  <body>
    ${header}
    <main role=main>
      <h2>Reset Password</h2>
      <p class=message>An e-mail has been sent.</p>
    </main>
    ${footer}
  </body>
</html>
    `)
  }
}

function serveConfirm (request, response) {
  if (request.method !== 'GET') {
    return serve405(request, response)
  }

  const token = request.parsed.query.token
  if (!UUID_RE.test(token)) {
    return invalidToken(request, response)
  }

  // Read the provided token.
  storage.token.read(token, (error, tokenData) => {
    if (error) return serve500(request, response, error)
    if (!tokenData || expired.token(tokenData)) {
      return invalidToken(request, response)
    }
    // Use the token.
    storage.token.use(token, error => {
      if (error) return serve500(request, response, error)
      const action = tokenData.action
      if (action !== 'confirm e-mail' && action !== 'change e-mail') {
        response.statusCode = 400
        return response.end()
      }
      const handle = tokenData.handle
      if (action === 'confirm e-mail') {
        storage.account.confirm(handle, error => {
          if (error) return serve500(request, response, error)
          serve303(request, response, '/login')
        })
      }
      if (action === 'change e-mail') {
        const email = tokenData.email
        let oldEMail
        runSeries([
          done => {
            storage.account.read(handle, (error, account) => {
              if (error) return done(error)
              oldEMail = account.email
              done()
            })
          },
          done => storage.account.update(handle, { email }, done),
          done => storage.email.delete(oldEMail, done),
          done => storage.email.update(email, { handle }, done)
        ], error => {
          if (error) return serve500(request, response, error)
          const title = 'E-Mail Change'
          response.setHeader('Content-Type', 'text/html')
          response.end(html`
<!doctype html>
<html lang=en-US>
  <head>
    ${meta({})}
    <title>${title}</title>
  </head>
  <body>
    ${nav(request)}
    ${header}
    <main role=main>
      <h2>${title}</h2>
      <p class=message>The e-mail address for your account was successfully changed.</p>
    </main>
    ${footer}
  </body>
</html>
          `)
        })
      }
    })
  })
}

function serveConnected (request, response) {
  if (request.method !== 'GET') {
    response.statusCode = 405
    return response.end()
  }

  const query = request.parsed.query
  if (query.error) {
    const description = query.error_description
    request.log.info({
      error: query.error,
      description
    }, 'Stripe Connect error')
    return fail(description)
  }

  const account = request.account
  const { scope, code, state } = query
  request.log.info({ scope, code, state }, 'Stripe redirect')
  if (scope === 'read_write' && code && state) {
    if (account.stripe.connected) {
      request.log.warn('Stripe already connected')
      return fail('already connected')
    }
    if (state !== account.stripe.connectNonce) {
      request.log.warn({ state }, 'Connect nonce mismatch')
      return fail('Stripe Connect security failure')
    }
    let token
    return runSeries([
      done => {
        var form = new FormData()
        form.append('grant_type', 'authorization_code')
        form.append('code', code)
        form.append('client_secret', environment.STRIPE_SECRET_KEY)
        form.pipe(
          https.request({
            method: 'POST',
            host: 'connect.stripe.com',
            path: '/oauth/token',
            headers: form.getHeaders()
          })
            .once('error', done)
            .once('response', function (response) {
              simpleConcatLimit(response, 1024, (error, buffer) => {
                if (error) return done(error)
                parseJSON(buffer, (error, parsed) => {
                  if (error) return done(error)
                  token = parsed
                  request.log.info(token, 'Stripe token')
                  done()
                })
              })
            })
        )
      },
      done => storage.account.update(account.handle, {
        stripe: { connected: true, token }
      }, done),
      done => storage.stripeID.create(token.stripe_user_id, {
        handle: account.handle,
        date: new Date().toISOString()
      }, done),
      done => notify.connectedStripe({ to: account.email }, error => {
        // Log the error, but don't fail.
        if (error) request.log.error(error, 'E-Mail Error')
        done()
      }),
      // Notify the administrator.
      done => {
        if (!process.env.ADMIN_EMAIL) return done()
        mail({
          to: process.env.ADMIN_EMAIL,
          subject: 'Stripe connected',
          text: [
            `Handle: ${account.handle}`,
            `E-Mail: ${account.email}`,
            `Stripe IP: ${token.stripe_user_id}`
          ].join('\n\n')
        }, error => {
          // Eat errors.
          if (error) request.log.error(error)
          done()
        })
      }
    ], error => {
      if (error) {
        request.log.info(error, 'Connect error')
        return fail(error)
      }
      response.statusCode = 303
      response.setHeader('Location', '/account')
      response.end()
    })
  }

  response.statusCode = 400
  response.end()

  function fail (message) {
    response.statusCode = 500
    response.setHeader('Content-Type', 'text/html')
    return response.end(`
<!doctype html>
<html lang=en-US>
  <head>
    ${meta({})}
    <title>Stripe Error</title>
  </head>
  <body>
    ${nav(request)}
    ${header}
    <main role=main>
      <h2>Problem Connecting Stripe</h2>
      <p>Stripe reported an error connecting your account:</p>
      <blockqute><p>${escapeHTML(message)}</p></blockqute>
    </main>
    ${footer}
  </body>
</html>
    `)
  }
}

function serveDisconnect (request, response) {
  if (request.method !== 'POST') return serve405(request, response)

  const account = request.account
  if (!account) return serve302(request, response, '/login')

  parseAndValidatePostBody({ action: '/disconnect', request }, (error, body) => {
    if (error) return serve500(request, response, error)
    stripe.oauth.deauthorize({
      client_id: environment.STRIPE_CLIENT_ID,
      stripe_user_id: account.stripe.token.stripe_user_id
    }, error => {
      // Note that this route does _not_ handle updating the
      // account record or otherwise process deauthorization.
      // Instead, the application waits for Stripe to
      // post confirmation to its webhook.
      if (error) {
        request.log.error(error)
        response.statusCode = 500
        return response.end()
      }
      response.setHeader('Content-Type', 'text/html')
      response.end(html`
<!doctype html>
<html lang=en-US>
  <head>
    ${meta({})}
    <title>Disconnected Stripe Account</title>
  </head>
  <body>
    ${nav(request)}
    ${header}
    <main role=main>
      <h2>Disconnected Stripe Account</h2>
      <p class=message>Stripe has been told to disconnect your account. The change should take effect shortly.</p>
    </main>
    ${footer}
  </body>
</html>
      `)
    })
  })
}

// /~{handle}
function serveUserPage (request, response) {
  const { handle } = request.parameters

  runAuto({
    account: done => storage.account.read(handle, (error, account) => {
      if (error) return done(error)
      if (!account) {
        var notFound = new Error('not found')
        notFound.statusCode = 404
        return done(error)
      }
      done(null, redactedAccount(account))
    }),
    email: ['account', (results, done) => {
      storage.email.read(results.account.email, done)
    }],
    orders: ['email', (results, done) => {
      runParallelLimit(results.email.orderIDs.map(
        orderID => done => storage.order.read(orderID, done)
      ), 4, done)
    }]
  }, (error, data) => {
    if (error) {
      if (error.statusCode === 404) return serve404(request, response)
      return serve500(request, response, error)
    }
    data.account.orders = data.orders.map(order => {
      return {
        handle: order.handle,
        project: order.project
      }
    })
    serveView(request, response, data.account, data => html`
<!doctype html>
<html lang=en-US>
  <head>
    ${meta({})}
    <title>${data.handle}</title>
  </head>
  <body>
    ${nav(request)}
    ${header}
    <main role=main>
      <img
          class=avatar
          src="${gravatar.url(data.email, { size: 200, rating: 'pg', protocol: 'https' })}">
      <h2>${data.handle}</h2>
      <ul class=badges>${
        accountBadges
          .filter(badge => data.badges[badge.key])
          .map(badge => `<li>${badgeImage(badge)}</li>`)
      }</ul>
      <p class=name>${escapeHTML(data.name)}</p>
      <p class=location>${escapeHTML(iso3166ToEnglish(data.location))}</p>
      <p class=affiliations>${escapeHTML(data.affiliations)}</p>
      ${data.urls.length > 0 && html`<ul class=urls>${data.urls.map(url => `<li>${urlLink(url)}</li>`)}</ul>`}
      <p class=joined>Joined ${data.created}</p>
      <h3>Projects</h3>
      <ul class=projects>
        ${data.projects.map(element => html`
        <li>
          <a href=/~${handle}/${element.project}>${element.project}</a>
        </li>
        `)}
      </ul>
      <h3>Licenses</h3>
      <ul class=licenses>${
        data.orders.map(order => html`
        <li>
          <a href=/~${order.handle}/${order.project}>${order.handle}/${order.project}</a>
        </li>
        `)
      }</ul>
    </main>
    ${footer}
  </body>
</html>
    `)
  })
}

// Given an internal account record, which includes private
// information like Stripe tokens, return a clone with just
// the properties that can be published.
function redactedAccount (account) {
  const returned = redacted(account, [
    'affiliations',
    'badges',
    'created',
    'email',
    'handle',
    'location',
    'name',
    'projects',
    'urls'
  ])
  returned.stripe = { connected: account.stripe.connected }
  return returned
}

// Helper Function for Redaction
function redacted (object, publishable) {
  const clone = JSON.parse(JSON.stringify(object))
  Object.keys(clone).forEach(key => {
    if (!publishable.includes(key)) delete clone[key]
  })
  return clone
}

// Helper Function for HTML-or-JSON Routes
function serveView (request, response, data, view) {
  const accept = request.headers.accept
  if (accept === 'application/json') {
    response.setHeader('Content-Type', 'application/json')
    return response.end(JSON.stringify(data))
  }
  response.setHeader('Content-Type', 'text/html')
  response.end(view(data))
}

// Create an <a href> for a URL, adding any site logos.
function urlLink (url) {
  const escaped = escapeHTML(url)
  const shortened = escapeHTML(url.replace(/^https?:\/\//, ''))
  const parsed = parseURL(url)
  const logo = hostLogos.find(host => parsed.hostname === host.hostname)
  return html`
<a href="${escaped}" target=_blank>${
  logo && `<img class=logo alt=logo src=/${logo.icon}.svg>`
}${shortened}</a>
  `
}

function badgeImage ({ key, display, title, icon }) {
  return html`
<img
    class=badge
    alt="${key}"
    title="${escapeHTML(title)}"
    src="/${icon}.svg">
  `
}

// Test-Only Route
// Used to do quick visual checks of badges and site logos.
function serveBadges (request, response) {
  response.setHeader('Content-Type', 'text/html')
  response.end(html`
<!doctype html>
<html lang=en-US>
  <head>
    ${meta({})}
    <title>Badges</title>
  </head>
  <body>
    ${nav(request)}
    ${header}
    <main role=main>
      <h2>User Badges</h2>
      <ul class=badges>${
        accountBadges.map(badge => `<li>${badgeImage(badge)}</li>`)
      }</ul>
      <h2>Project Badges</h2>
      <ul class=badges>${
        projectBadges.map(badge => `<li>${badgeImage(badge)}</li>`)
      }</ul>
      <h2>Host Logos</h2>
      ${urlLink('https://github.com/artlessdevices')}
      ${urlLink('https://gitlab.com/kemitchell')}
      ${urlLink('https://twitter.com/licensezero')}
    </main>
    ${footer}
  </body>
</html>
  `)
}

// /~{handle}/{project}
function serveProjectPage (request, response) {
  const { handle, project } = request.parameters
  const slug = `${handle}/${project}`

  runParallel({
    account: read(storage.account.read, handle, 'account'),
    project: read(storage.project.read, slug, 'project')
  }, (error, data) => {
    if (error) {
      if (error.statusCode === 404) return serve404(request, response)
      return serve500(request, response, error)
    }
    const project = redactedProject(data.project)
    project.account = redactedAccount(data.account)
    project.slug = slug
    serveView(request, response, project, data => html`
<!doctype html>
<html lang=en-US>
  <head>
    ${meta({})}
    <title>${data.slug}</title>
  </head>
  <body>
    ${nav(request)}
    ${header}
    <main role=main>
      <h2>${data.project}</h2>
      ${badgesList(data)}
      <ol id=customers>
        ${data.customers.map(c => html`
        <li>
          <img
              src="${c.gravatar}"
              alt="${escapeHTML(c.name)}">
          <span class=name>${escapeHTML(c.name)}</span>
          ${c.affiliations && `<span class=affiliations>${escapeHTML(c.affiliations)}</span>`}
        </li>
        `)}
      </ol>
      <ul class=urls>${data.urls.map(url => `<li>${urlLink(url)}</li>`)}</ul>
      <p class=handle><a href=/~${handle}>${handle}</a></p>
      <p class=price><span id=price class=currency>$${data.price.toString()}</span></p>
      <p class=category><span id=category>${data.category}</span></p>
      <p class=created>Since ${data.created}</p>
      <p class=availability>${data.account.stripe.connected ? 'available for sale' : 'not available for sale'}</p>
      ${
        (
          data.account.stripe.connected &&
          (
            !request.account ||
            request.account.handle !== data.account.handle
          )
        )
          ? buyForm({
            csrf: csrf.inputs({
              action: '/buy',
              sessionID: request.session.id
            }),
            name: accountValue('name'),
            location: accountValue('location'),
            email: accountValue('email'),
            handle: { value: data.account.handle },
            project: { value: data.project }
          })
          : '<p>Licenses are not available for sale at this time.</p>'
      }
    </main>
    ${footer}
  </body>
</html>
    `)

    function accountValue (key) {
      if (!request.account) return {}
      return { value: request.account[key] }
    }
  })

  function read (read, name, typeString) {
    return done => read(name, (error, data) => {
      if (error) return done(error)
      if (!data) {
        var notFound = new Error(`${typeString} not found`)
        notFound.statusCode = 404
        return done(error)
      }
      done(null, data)
    })
  }
}

function buyForm (data) {
  ['account', 'project', 'name', 'email', 'location', 'terms']
    .forEach(key => {
      if (!data[key]) data[key] = {}
    })
  return html`
<form id=buyForm action=/buy method=post>
  ${data.error}
  ${data.csrf}
  <input
      name=handle
      type=hidden
      value="${escapeHTML(data.handle.value || '')}">
  <input
      name=project
      type=hidden
      value="${escapeHTML(data.project.value || '')}">
  <fieldset>
    <legend>About You</legend>
    <label>
      Your Legal Name
      <input
        name=name
        type=text
        value="${escapeHTML(data.name.value || '')}"
        required>
    </label>
    ${data.name.error}
    <label>
      Location
      <input
        name=location
        type=text
        value="${escapeHTML(data.location.value || '')}"
        list=locations
        autocomplete=off
        required>
    </label>
    <datalist id=locations>
      ${locationOptions()}
    </datalist>
    ${data.location.error}
    <label>
      E-Mail
      <input
        name=email
        type=email
        value="${escapeHTML(data.email.value || '')}"
        required>
    </label>
    ${data.email.error}
  </fieldset>
  <fieldset id=paymentFieldSet>
    <legend>Payment</legend>
    <div id=card></div>
    <div id=card-errors></div>
    <noscript>You must enable JavaScript in your browser to process payment.</noscript>
  </fieldset>
  <fieldset>
    <legend>Terms</legend>
    <label>
      <input name=terms type=checkbox value=accepted required>
      Check this box to accept the
      <a href=/service target=_blank>terms of service</a>.
    </label>
    ${data.terms.error}
  </fieldset>
  <button id=buySubmitButton type=submit>Buy</button>
</form>
<script>STRIPE_PUBLISHABLE_KEY = ${JSON.stringify(environment.STRIPE_PUBLISHABLE_KEY)}</script>
<script src=https://js.stripe.com/v3/></script>
<script src=/buy.js></script>
  `
}

function locationOptions () {
  return locations.map(function (code) {
    var parsed = iso31662.subdivision(code)
    return html`
<option value="${escapeHTML(code)}">
  ${escapeHTML(parsed.countryName)}:
  ${escapeHTML(parsed.name)}
</option>
    `
  })
}

function serveBuy (request, response) {
  const title = 'Buy a License'
  const action = '/buy'

  const fields = {
    handle: {
      displayName: 'handle',
      filter: e => e.toLowerCase().trim(),
      validate: handles.validate
    },
    project: {
      displayName: 'project',
      filter: e => e.toLowerCase().trim(),
      validate: projects.validate
    },
    name: {
      displayName: 'name',
      filter: e => e.trim(),
      validate: s => s.length > 3
    },
    email: {
      displayName: 'e-mail address',
      filter: e => e.toLowerCase().trim(),
      validate: e => EMAIL_RE.test(e)
    },
    location: {
      displayName: 'location',
      validate: code => locations.includes(code)
    },
    terms: {
      displayName: 'terms checkbox',
      validate: e => e === 'accepted'
    },
    token: {
      displayName: 'payment token',
      validate: e => typeof e === 'string' && e.startsWith('tok_')
    }
  }

  formRoute({
    action,
    form,
    fields,
    processBody,
    onSuccess
  })(request, response)

  function processBody (request, body, done) {
    const { handle, project, name, email, location, token } = body
    let accountData, projectData
    let orderID, paymentIntent
    const date = new Date().toISOString()
    runSeries([
      // Read account.
      done => {
        storage.account.read(handle, (error, data) => {
          if (error) return done(error)
          if (!data) {
            const error = new Error('no such account')
            error.statusCode = 400
            return done(error)
          }
          if (!data.stripe.connected) {
            const error = new Error('account not set up to sell')
            error.statusCode = 400
            return done(error)
          }
          accountData = data
          done()
        })
      },

      // Read project.
      done => {
        const name = `${handle}/${project}`
        storage.project.read(name, (error, data) => {
          if (error) return done(error)
          if (!data) {
            const error = new Error('no such project')
            error.fieldName = 'project'
            error.statusCode = 400
            return done(error)
          }
          projectData = redactedProject(data)
          done()
        })
      },

      // Create an order.
      done => {
        orderID = uuid.v4()
        storage.order.create(orderID, {
          orderID,
          date,
          handle,
          project,
          name,
          email,
          location,
          projectData: projectData,
          fulfilled: false
        }, error => {
          if (error) {
            error.statusCode = 500
            return done(error)
          }
          request.log.info({ orderID }, 'orderID')
          done()
        })
      },

      // https://stripe.com/docs/connect/destination-charges
      done => {
        const amount = projectData.price * 100
        const stripeID = accountData.stripe.token.stripe_user_id
        const options = {
          amount,
          confirm: true,
          receipt_email: email,
          payment_method_data: {
            type: 'card',
            card: { token }
          },
          currency: 'usd',
          metadata: { orderID },
          on_behalf_of: stripeID,
          transfer_data: { destination: stripeID }
        }
        // Stripe will not accept application_fee_amount=0.
        const fee = Math.floor(
          amount * (projectData.commission / 100)
        )
        if (fee > 0) options.application_fee_amount = fee
        request.log.info({ options }, 'payment intent options')
        stripe.paymentIntents.create(options, (error, data) => {
          if (error) {
            const code = error.code
            if (
              code === 'card_declined' ||
              code === 'expired_card' ||
              code === 'incorrect_cvc' ||
              code === 'processing_error' ||
              code === 'incorrect_number'
            ) {
              const userError = new Error(error.message)
              userError.statusCode = 400
              return done(userError)
            }
            error.statusCode = 500
            return done(error)
          }
          paymentIntent = data
          request.log.info({ paymentIntent }, 'payment intent')
          done()
        })
      },

      // Update order with Payment Intent ID.
      done => storage.order.update(orderID, {
        paymentIntentID: paymentIntent.id
      }, done),

      // Notify the administrator.
      done => {
        if (!process.env.ADMIN_EMAIL) return done()
        mail({
          to: process.env.ADMIN_EMAIL,
          subject: 'Buy Initiated',
          text: `
Handle: ${handle}
Project: ${project}

Name: ${name}
Location: ${iso3166ToEnglish(location)}
E-Mail: ${email}

Order: ${orderID}
Payment Intent: ${paymentIntent.id}
`
        }, error => {
          // Eat errors.
          if (error) request.log.error(error)
          done()
        })
      }
    ], done)
  }

  function onSuccess (request, response) {
    response.setHeader('Content-Type', 'text/html')
    response.end(html`
<!doctype html>
<html lang=en-US>
  <head>
    ${meta({})}
    <title>${title}</title>
  </head>
  <body>
    ${nav(request)}
    ${header}
    <main role=main>
      <h2>Success</h2>
      <p class=message>Thank you for buying a license! As soon as your payment clears, you will receive an e-mail with your license and receipt.</p>
    </main>
    ${footer}
  </body>
</html>
  `)
  }

  function form (request, data) {
    response.setHeader('Content-Type', 'text/html')
    response.end(html`
<!doctype html>
<html lang=en-US>
  <head>
    ${meta({})}
    <title>${title}</title>
  </head>
  <body>
    ${nav(request)}
    ${header}
    <main role=main>
      <h2>${title}</h2>
      ${buyForm(data)}
    </main>
    ${footer}
  </body>
</html>
    `)
  }
}

function iso3166ToEnglish (code) {
  const parsed = iso31662.subdivision(code)
  return parsed.name + ', ' + parsed.countryName
}

function badgesList (project) {
  const badges = project.badges
  const hasSomeBadge = Object.keys(badges).some(key => badges[key])
  if (!hasSomeBadge) return ''
  return html`
<ul class=badges>${
  projectBadges
    .filter(badge => project.badges[badge.key])
    .map(badge => `<li>${badgeImage(badge)}</li>`)
}</ul>
  `
}

// Given an internal project record, which might include
// private information, return a clone with just the
// properties that can be published.
function redactedProject (project) {
  const returned = redacted(project, [
    'badges',
    'category',
    'created',
    'price',
    'project',
    'urls'
  ])
  returned.customers = project.customers.map(c => {
    return {
      name: c.name,
      gravatar: gravatar.url(c.email, {
        size: 100,
        rating: 'pg',
        default: 'identicon',
        protocol: 'https'
      })
    }
  })
  return returned
}

function serveStripeWebhook (request, response) {
  simpleConcatLimit(request, 2048, (error, buffer) => {
    if (error) return fail(error)

    let event
    try {
      event = stripe.webhooks.constructEvent(
        // constructEvent wants the raw, unparsed JSON request body.
        buffer.toString(),
        request.headers['stripe-signature'],
        process.env.STRIPE_WEBHOOK_SECRET
      )
    } catch (error) {
      request.log.warn(error)
      response.statusCode = 400
      return response.end()
    }

    request.log.info({ event }, 'Stripe webhook event')

    // Ignore test-mode events in production.
    if (environment.production && !event.testmode) {
      return response.end()
    }

    const type = event.type

    // Handle Stripe Connect Deauthorizations
    if (type === 'account.application.deauthorized') {
      const stripeID = event.account
      request.log.info({ stripeID }, 'Stripe ID')
      let handle
      return runSeries([
        done => storage.stripeID.read(stripeID, (error, record) => {
          if (error) return done(error)
          if (!record) return done(new Error('unknown Stripe account'))
          handle = record.handle
          done()
        }),
        done => storage.account.update(handle, {
          stripe: {
            connected: false,
            connectNonce: randomNonce()
          }
        }, done),
        done => storage.stripeID.delete(stripeID, done)
      ], error => {
        if (error) return fail(error)
        request.log.info({ handle }, 'Stripe disconnected')
        response.statusCode = 200
        response.end()
      })

    // Handle payment success.
    } else if (type === 'payment_intent.succeeded') {
      const intent = event.data.object
      const orderID = intent.metadata.orderID
      if (!orderID) {
        response.statusCode = 500
        request.log.error('no orderID metadata')
        return response.end()
      }
      request.log.info({ orderID }, 'payment succeeded')
      const date = new Date().toISOString()
      return storage.order.read(orderID, (error, order) => {
        if (error) {
          request.log.error(error, 'error reading order')
          response.statusCode = 500
          return response.end()
        }
        if (!order) {
          request.log.error(error, 'error reading order')
          response.statusCode = 500
          return response.end()
        }

        const handle = order.handle
        const project = order.project
        let account, signature
        const docxPath = storage.license.path(orderID) + '.docx'
        const pdfPath = storage.license.path(orderID) + '.pdf'
        runSeries([
          // Read account.
          done => storage.account.read(handle, (error, data) => {
            if (error) {
              error.statusCode = 500
              return done(error)
            }
            account = data
            done()
          }),

          // Make directory for license files.
          done => storage.license.mkdirp(done),

          // Generate license .docx.
          done => {
            fs.readFile(
              path.join(__dirname, 'terms', 'paid.md'),
              'utf8',
              (error, markup) => {
                if (error) return done(error)
                let parsed
                const munged = commonformify(markup)
                try {
                  parsed = cfCommonMark.parse(munged)
                } catch (error) {
                  request.log.error(error, 'Common Form parse')
                }
                const blanks = {
                  'developer name': account.name,
                  'developer location': account.location,
                  'developer e-mail': account.email,
                  'agent name': 'Artless Devices LLC',
                  'agent location': 'US-CA',
                  'agent website': 'https://artlessdevices.com',
                  'user name': order.name,
                  'user location': order.location,
                  'user e-mail': order.email,
                  'software URL': order.projectData.urls[0],
                  'software category': order.projectData.category,
                  price: order.projectData.price.toString(),
                  date,
                  term: 'forever'
                }
                cfDOCX(
                  parsed.form,
                  cfPrepareBlanks(blanks, parsed.directions),
                  {
                    title: parsed.frontMatter.title,
                    edition: parsed.frontMatter.version,
                    numbering: outlineNumbering
                  }
                )
                  .generateAsync({ type: 'nodebuffer' })
                  .catch(error => done(error))
                  .then(buffer => {
                    fs.writeFile(docxPath, buffer, error => {
                      if (error) return done(error)
                      request.log.info({ path: docxPath }, 'wrote .docx')
                      done()
                    })
                  })
              }
            )
          },

          // Convert .docx to .pdf.
          done => docxToPDF(docxPath, error => {
            if (error) return done(error)
            request.log.info({ path: pdfPath }, 'wrote')
            done()
          }),

          // Generate and record signature.
          done => {
            fs.readFile(pdfPath, (error, buffer) => {
              if (error) return done(error)
              signature = signatures.sign(
                buffer,
                process.env.PUBLIC_KEY,
                process.env.PRIVATE_KEY
              )
              request.log.info({ signature }, 'signature')
              storage.signature.record({
                signature, date, orderID
              }, error => {
                if (error) return done(error)
                request.log.info('recorded')
                done()
              })
            })
          },

          // E-mail customer.
          done => {
            notify.license({
              to: order.email,
              cc: account.email,
              bcc: process.env.ADMIN_EMAIL,
              handle,
              project,
              orderID,
              price: order.projectData.price,
              signature
            }, error => {
              if (error) return done(error)
              request.log.info('license e-mail sent')
              done()
            })
          },

          // Add to project transcript.
          done => storage.project.update(
            `${handle}/${project}`,
            (data, done) => {
              const entry = {
                orderID,
                date,
                name: order.name,
                email: order.email,
                location: order.location
              }
              data.customers.push(entry)
              done()
            },
            done
          ),

          // Add to list of orders by e-mail.
          done => storage.email.update(
            order.email,
            (data, done) => {
              data.orderIDs.push(orderID)
              done()
            },
            done
          ),

          // Update order file.
          done => storage.order.update(orderID, {
            fulfilled: new Date().toISOString(),
            paymentIntent: intent
          }, (error, success) => {
            if (error) return done(error)
            if (!success) {
              request.log.error({ orderID }, 'failed updating order')
            }
            done()
          })
        ], error => {
          if (error) {
            request.log.error(error)
            response.statusCode = 500
            return response.end()
          }
          response.end()
        })
      })
    }

    response.statusCode = 400
    response.end()
  })

  function fail (error) {
    request.log.error(error)
    response.statusCode = 500
    return response.end()
  }
}

const cookieName = constants.website.toLowerCase()

function setCookie (response, value, expires) {
  response.setHeader(
    'Set-Cookie',
    cookie.serialize(cookieName, value, {
      expires,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV !== 'test'
    })
  )
}

function clearCookie (response) {
  setCookie(response, '', new Date('1970-01-01'))
}

function locationInput (value) {
  return html`
<p>
  <label for=location>Location</label>
  <input
    name=location
    type=text
    value="${escapeHTML(value || '')}"
    list=locations
    autocomplete=off
    placeholder=US-CA
    required>
</p>
<datalist id=locations>
  ${locationOptions()}
</datalist>
<p>The <a href=https://en.wikipedia.org/wiki/ISO_3166-2 target=_blank>ISO 3166-2</a> code for where you pay taxes.</p>
<p>${constants.website} will publish your location.</p>
  `
}

function nameInput ({ value, autofocus }) {
  return html`
<p>
  <label for=name>Name</label>
  <input
      name=name
      type=text
      placeholder="Charlie Smith"
      pattern="^.{3,}$"
      value="${escapeHTML(value || '')}"
      ${autofocus && 'autofocus'}
      required>
</p>
<p>${constants.website} requires your full legal name to document your transactions.</p>
<p>${constants.website} will publish your name.</p>
  `
}

function urlInput ({ value, required }) {
  return html`
<p>
  <label for=url>URL</label>
  <input
      name=url
      type=url
      ${required && 'required'}
      value="${escapeHTML(value || '')}">
</p>
  `
}

function eMailInput ({ value, autofocus }) {
  return html`
<p>
  <label for=email>E-Mail</label>
  <input
      name=email
      type=email
      placeholder=charlie@example.com
      value="${escapeHTML(value || '')}"
      ${autofocus ? 'autofocus' : ''}
      required>
</p>
<p>${constants.website} will publish your e-mail address and uses it to request your <a href=https://gravatar.com>Gravatar</a>.</p>
<p>Feel free to use a ${constants.website}-specific address or mail alias.</p>
  `
}

function passwordInput ({ label, autofocus }) {
  return html`
<p>
  <label for=password>${escapeHTML(label || 'Password')}</label>
  <input
      name=password
      type=password
      required
      autocomplete=off
      ${autofocus ? 'autofocus' : ''}>
</p>
  `
}

function passwordRepeatInput () {
  return html`
<p>
  <label for=repeat>Repeat</label>
  <input
      name=repeat
      type=password
      pattern="^${passwords.pattern}$"
      required
      autocomplete=off>
</p>
  `
}

// Helper Function for HTML Form Endpoints
function formRoute ({
  action,
  requireAuthentication,
  loadGETData,
  form,
  fields,
  fieldSizeLimit = 512000,
  processBody,
  onPost,
  onSuccess
}) {
  if (typeof form !== 'function') {
    throw new TypeError('missing form function')
  }

  if (typeof processBody !== 'function') {
    throw new TypeError('missing processBody function')
  }

  if (typeof onSuccess !== 'function') {
    throw new TypeError('missing onSuccess function')
  }

  const fieldNames = Object.keys(fields)
  fieldNames.forEach(fieldName => {
    const description = fields[fieldName]
    if (typeof description.validate !== 'function') {
      throw new TypeError('missing validate function for ' + fieldName)
    }
    if (!description.displayName) {
      description.displayName = fieldName
    }
  })

  return (request, response) => {
    const method = request.method
    const isGet = method === 'GET'
    const isPost = !isGet && method === 'POST'
    if (!isGet && !isPost) return serve405(request, response)
    proceed()

    function proceed () {
      if (requireAuthentication && !request.account) {
        return serve303(request, response, '/login')
      }
      if (isGet) return get(request, response)
      post(request, response)
    }
  }

  function get (request, response, body, error) {
    response.setHeader('Content-Type', 'text/html')
    const data = {}
    if (body) {
      fieldNames.forEach(fieldName => {
        data[fieldName] = {
          value: body[fieldName],
          error: error && error.fieldName === fieldName
            ? `<p class=error>${escapeHTML(error.message)}</p>`
            : ''
        }
      })
    } else {
      fieldNames.forEach(fieldName => {
        data[fieldName] = { value: '', error: false }
      })
    }
    if (error && !error.fieldName) {
      data.error = `<p class=error>${escapeHTML(error.message)}</p>`
    }
    data.csrf = csrf.inputs({
      action,
      sessionID: request.session.id
    })
    if (loadGETData) {
      return loadGETData(request, data, error => {
        if (error) return serve500(request, response, error)
        response.end(form(request, data))
      })
    }
    response.end(form(request, data))
  }

  function post (request, response) {
    if (onPost) onPost(request, response)

    let body, fromProcess
    runSeries([
      done => parseAndValidatePostBody({
        action, request, fields, fieldSizeLimit
      }, (error, parsed) => {
        if (error) return done(error)
        body = parsed
        done()
      }),
      process
    ], error => {
      if (error) {
        const statusCode = error.statusCode
        if (statusCode >= 400 && statusCode < 500) {
          response.statusCode = statusCode
          return get(request, response, body, error)
        }
        return serve500(request, response, error)
      }
      onSuccess(request, response, body, fromProcess)
    })

    function process (done) {
      processBody(request, body, (error, result) => {
        if (error) return done(error)
        fromProcess = result
        done()
      })
    }
  }
}

function parseAndValidatePostBody ({
  action,
  request,
  fields = {},
  fieldSizeLimit = 512000
}, callback) {
  const fieldNames = Object.keys(fields)
  const body = {}

  runSeries([parse, validate], error => {
    if (error) return callback(error)
    callback(null, body)
  })

  function parse (done) {
    request.pipe(
      new Busboy({
        headers: request.headers,
        limits: {
          fieldNameSize: Math.max(
            fieldNames
              .concat('csrftoken', 'csrfnonce')
              .map(n => n.length)
          ),
          fields: fieldNames.length + 2,
          fieldSizeLimit,
          parts: 1
        }
      })
        .on('field', function (name, value, truncated, encoding, mime) {
          if (name === 'csrftoken' || name === 'csrfnonce') {
            body[name] = value
            return
          }
          const description = fields[name]
          if (!description) return
          const filteredValue = description.filter
            ? description.filter(value)
            : value
          if (description.optional && filteredValue === '') return
          body[name] = filteredValue
        })
        .once('finish', done)
    )
  }

  function validate (done) {
    for (let index = 0; index < fieldNames.length; index++) {
      const fieldName = fieldNames[index]
      const description = fields[fieldName]
      const value = body[fieldName]
      if (description.optional && value === undefined) continue
      const valid = description.validate(value, body)
      if (valid) continue
      const error = new Error('invalid ' + description.displayName)
      error.statusCode = 401
      return done(error)
    }
    csrf.verify({
      action,
      sessionID: request.session.id,
      token: body.csrftoken,
      nonce: body.csrfnonce
    }, done)
  }
}

function serve404 (request, response) {
  response.statusCode = 404
  response.setHeader('Content-Type', 'text/html')
  response.end(`
<!doctype html>
<html lang=en-US>
  <head>
    ${meta({})}
    <title>Not Found</title>
  </head>
  <body>
    ${nav(request)}
    ${header}
    <main role=main>
      <h2>Not Found</h2>
      <p>The page you tried to visit doesn’t exist on this site.</p>
    </main>
    ${footer}
  </body>
</html>
  `)
}

function serve500 (request, response, error) {
  request.log.error(error)
  response.statusCode = 500
  response.setHeader('Content-Type', 'text/html')
  response.end(html`
<!doctype html>
<html lang=en-US>
  <head>
    ${meta({})}
    <title>Internal Error</title>
  </head>
  <body>
    <main role=main>
      <h1>Internal Error</h1>
      <p>The server ran into an error.</p>
      <p>
        If you'd like, you can
        <a href=mailto:support@stricteq.com>e-mail support</a>,
        pasting in this unique support number:
        <code>${escapeHTML(request.id)}</code>
      </p>
    </main>
    ${footer}
  </body>
</html>
  `)
}

function serve405 (request, response) {
  response.statusCode = 405
  response.setHeader('Content-Type', 'text/plain')
  response.end('Method Not Allowed')
}

function serve303 (request, response, location) {
  response.statusCode = 303
  response.setHeader('Location', location)
  response.end()
}

function serve302 (request, response, location) {
  response.statusCode = 302
  response.setHeader('Location', location)
  response.end()
}

function authenticate (request, response, handler) {
  const header = request.headers.cookie
  if (!header) {
    createGuestSession()
    return proceed()
  }
  const parsed = cookie.parse(header)
  const sessionID = parsed[cookieName]
  if (!sessionID) {
    createGuestSession()
    return proceed()
  }
  storage.session.read(sessionID, function (error, session) {
    /* istanbul ignore if */
    if (error) return serve500(request, response, error)
    if (!session) {
      request.session = { id: sessionID }
      return proceed()
    }
    const handle = session.handle
    request.log.info({ sessionID, handle }, 'authenticated')
    request.session = session
    runParallel({
      account: function (done) {
        storage.account.read(handle, done)
      }
    }, function (error, results) {
      /* istanbul ignore if */
      if (error) return serve500(request, response, error)
      const account = results.account
      if (!account) {
        const error = new Error('could not load account')
        return serve500(request, response, error)
      }
      if (account.confirmed) request.account = account
      proceed()
    })
  })

  function proceed () {
    handler(request, response)
  }

  function createGuestSession () {
    const id = uuid.v4()
    const expires = new Date(
      Date.now() + (30 * 24 * 60 * 60 * 1000)
    )
    setCookie(response, id, expires)
    request.session = { id, expires }
  }
}
