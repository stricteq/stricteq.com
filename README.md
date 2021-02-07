# Toolwrights

craft-made, user-supported public software

## Architecture

Node.js application.  No framework.  Most action in [`./index.js`](./index.js).  [JavaScript Standard Style](https://standardjs.com/).

## Testing Requirements

- Stripe account

- environment variables, including Stripe testing keys

- [Stripe CLI](https://stripe.com/docs/stripe-cli) on `$PATH` and connected with `stripe login`

- [Firefox](https://www.mozilla.org/en-US/firefox/) and [geckodriver](https://github.com/mozilla/geckodriver)

- [pandoc](https://pandoc.org) and [pdflatex](https://www.latex-project.org/)

- `npm run test` or `npm run coverage`
