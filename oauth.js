'use strict'

const logger = require('winston')
const jsonwebtoken = require('jsonwebtoken')
const request = require('request')

// Obtain an OAuth token for the app, repeat at regular intervals before the
// token expires. Returns a function that will always return a current
// valid token.
exports.run = (appId, secret, cb) => {
  let tok

  // Return the current token
  const current = () => tok

  // Return the time to live of a token
  const ttl = (tok) =>
    Math.max(0, jsonwebtoken.decode(tok).exp * 1000 - Date.now())

  // Refresh the token
  const refresh = (cb) => {
    logger.info(`Requesting token for appId '${appId}' and secret '${secret.replace(/.*/, '*')}'`)

    request.post('https://api.watsonwork.ibm.com/oauth/token', {
      auth: {
        user: appId,
        pass: secret
      },
      json: true,
      form: {
        grant_type: 'client_credentials'
      }
    }, (err, res) => {
      if (err || res.statusCode !== 200) {
        logger.error(`Error (${res.statusCode}) requesting token error '${err}'`)
        logger.error(res.body)

        cb(err || new Error(res.statusCode), current)
        return
      }

      // Save the fresh token
      logger.info(`Successfully requested token`)
      tok = res.body.access_token

      // Schedule next refresh a bit before the token expires
      const t = ttl(tok)
      logger.verbose('Token time-to-live', t)
      setTimeout(() => { refresh(cb) }, Math.max(0, t - 60000)).unref()

      // Return a function that'll return the current token
      cb(undefined, current)
    })
  }

  // Obtain initial token
  setImmediate(() => refresh(cb))
}
