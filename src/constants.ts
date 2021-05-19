export const SELECTED_WALLET_COOKIE_KEY = 'selectedWallet'

export const COOKIE_OPTIONS = Object.freeze({
  sameSite: 'strict',
  secure: process.env.NEXT_JS_DOMAIN_NAME === 'pooltogether.com',
  domain: process.env.NEXT_JS_DOMAIN_NAME && `.${process.env.NEXT_JS_DOMAIN_NAME}`
})