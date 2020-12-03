import tap from 'tap'
import displayDate from '../display-date.js'

tap.test('display date', test => {
  const iso = '2020-11-27T18:04:16.354Z'
  test.equal(
    displayDate(iso),
    `<date datetime="${iso}">November 27, 2020</date>`
  )
  test.end()
})
