const tape = require('tape')
const displayDate = require('../display-date')

tape('display date', test => {
  const iso = '2020-11-27T18:04:16.354Z'
  test.equal(
    displayDate(iso),
    `<date datetime="${iso}">November 27, 2020</date>`
  )
  test.end()
})
