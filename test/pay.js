export default async ({
  page,
  number = '4242'.repeat(4),
  expiration = '10 / 31',
  cvc = '123',
  zip = '12345'
}) => {
  const frame = await page.frame({ url: /.*stripe.*elements.*/ })
  await frame.fill('input[name="cardnumber"]', number)
  await frame.fill('input[name="exp-date"]', expiration)
  await frame.fill('input[name="cvc"]', cvc)
  await frame.fill('input[name="postal"]', zip)
}
