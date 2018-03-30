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
    logger.info(`Requesting token for appId '${appId}' and secret`)

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
      if (err) {
        logger.error(`Error requesting token error '${err}'`)
        cb(err, current)
        return
      } else if (res.statusCode !== 200) {
        logger.error(`Bad status code requesting token: ${res.statusCode}`)
        cb(new Error(res.statusCode), current)
        return
      } else {

        // Save the fresh token
        logger.info(`Successfully requested token`)
        tok = res.body.access_token

        // Schedule next refresh a bit before the token expires
        const t = ttl(tok)
        logger.verbose('Token time-to-live', t)
        setTimeout(() => { refresh(cb) }, Math.max(0, t - 60000)).unref()

        // Return a function that'll return the current token
        cb(null, current)
      }
    })
  }

  // Obtain initial token
  setImmediate(() => refresh(cb))
}
