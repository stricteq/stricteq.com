import http from 'http'
import runSeries from 'run-series'
import server from './server.js'
import tap from 'tap'

const terms = [
  ['service', ['1.0.0']],
  ['agency', ['2.0.0']],
  ['privacy', ['1.0.0']],
  ['free', ['1.1.0']],
  ['paid', ['1.0.0']],
  ['deal', ['1.1.0']]
]

terms.forEach(testTerms)

function testTerms ([slug, versions]) {
  tap.test(slug, test => {
    server((port, close) => {
      runSeries(
        versions
          .map(version => done => {
            http.request({ path: `/${slug}/${version}`, port })
              .once('response', response => {
                test.equal(response.statusCode, 200, `${version}: 200`)
                done()
              })
              .end()
          })
          .concat(done => {
            http.request({ path: `/${slug}`, port })
              .once('response', response => {
                test.equal(response.statusCode, 303, 'index: 303')
                done()
              })
              .end()
          })
          .concat(done => {
            http.request({ path: `/${slug}/404.0.0`, port })
              .once('response', response => {
                test.equal(response.statusCode, 404, '404.0.0: 404')
                done()
              })
              .end()
          })
          .concat(done => {
            http.request({ path: `/${slug}/x/y/z`, port })
              .once('response', response => {
                test.equal(response.statusCode, 404, 'x/y/z: 404')
                done()
              })
              .end()
          }),
        () => {
          test.end()
          close()
        }
      )
    })
  })
}
