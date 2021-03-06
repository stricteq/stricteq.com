// Send E-Mail Nofications

import constants from './constants.js'
import fs from 'fs'
import mail from './mail.js'
import markdown from './markdown.js'
import * as storage from './storage.js'

export const confirmEMail = ({ to, handle, url }, callback) => {
  send({
    to,
    subject: `Confirm ${constants.website} Account`,
    markup: `
Follow this link to confirm your ${constants.website} account:

<${url}>
    `.trim()
  }, callback)
}

export const passwordReset = ({ to, handle, url }, callback) => {
  send({
    to,
    subject: `Reset ${constants.website} Password`,
    markup: `
To reset the password for your ${constants.website} account, follow this link:

<${url}>
    `.trim()
  }, callback)
}

export const passwordChanged = ({ to }, callback) => {
  send({
    to,
    subject: `${constants.website} Password Change`,
    markup: `
The password for your ${constants.website} account on was changed.
    `.trim()
  }, callback)
}

export const handleReminder = ({ to, handle }, callback) => {
  send({
    to,
    subject: `Your ${constants.website} Handle`,
    markup: `Your handle on ${constants.website} is "${handle}".`
  }, callback)
}

export const changeEMail = ({ to, url }, callback) => {
  send({
    to,
    subject: `Confirm ${constants.website} E-Mail Change`,
    markup: `
To confirm the new e-mail address for your ${constants.website} account, follow this link:

<${url}>
    `.trim()
  }, callback)
}

export const connectedStripe = ({ to }, callback) => {
  send({
    to,
    subject: `Stripe Account Connected to ${constants.website}`,
    markup: `
You've successfully connected your Stripe account to your ${constants.website} account.
    `.trim()
  }, callback)
}

export const license = ({
  to,
  cc,
  bcc,
  handle,
  project,
  orderID,
  signature,
  price
}, callback) => {
  send({
    to,
    cc,
    bcc,
    subject: 'Your License',
    markup: `
Thank you for buying a license through ${constants.website}!

A copy of your license is attached.

Project: <${process.env.BASE_HREF}/~${handle}/${project}>

Price: $${price.toString()}

Order ID: \`${orderID}\`

Cryptographic Signature: \`${signature}\`
    `.trim(),
    attachments: [
      {
        filename: 'license.pdf',
        content: fs.createReadStream(
          storage.license.path(orderID) + '.pdf'
        )
      }
    ]
  }, callback)
}

function send ({ from, to, cc, bcc, subject, markup, attachments }, callback) {
  mail({
    from: {
      name: constants.website,
      address: process.env.NOTIFICATIONS_EMAIL
    },
    to,
    cc,
    bcc,
    subject,
    text: markup,
    html: markdown(markup, { safe: true }),
    attachments
  }, callback)
}
