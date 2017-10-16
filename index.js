'use strict'

const graphql = require('./graphql')
const request = require('request-promise')
const logger = require('winston')
const oauth = require('./oauth')
const Promise = require('bluebird')
const ui = require('./ui')

const baseUrl = 'https://api.watsonwork.ibm.com'

// export the logger to allow logger.level to be set
exports.logger = logger

function pick (property, promise) {
  return new Promise((resolve, reject) => {
    promise.then(response => resolve(response[property]))
    .catch(err => reject(err))
  })
}

function map (property, fn, promise) {
  return new Promise((resolve, reject) => {
    promise.then(response => {
      if (response[property]) {
        response[property] = response[property].map(fn)
      } else {
        logger.warn(`Map requested on missing property '${property}'`)
      }
      resolve(response)
    })
    .catch(err => reject(err))
  })
}

function jsonify (obj) {
  return JSON.parse(obj)
}

exports.authenticate = (appId, appSecret) => {
  return new Promise((resolve, reject) => {
    const retry = 10000
    let errors = 0

    oauth.run(
      appId,
      appSecret,
      (err, token) => {
        if (err) {
          logger.error(`Failed to get JWT token; retrying in ${retry / 1000} seconds`)
          errors++
          if (errors > 10) {
            reject(new Error(`Too many JWT token attempts giving up`))
          }
          setTimeout(exports.authenticate, retry)
          return
        }

        // the token is stored in process.env to be shared with other modules
        process.env.jwtToken = token()
        resolve(token())
      })
  })
}

exports.sendGraphql = (query) => {
  const headers = {
    'Content-Type': typeof query === 'string' ? 'application/json' : 'application/json',
    'x-graphql-view': 'PUBLIC, BETA'
  }

  return pick('data', exports.sendRequest(`graphql`, 'POST', headers, query))
}

exports.sendRequest = (route, method, headers, body) => {
  // add the auth header for convenience
  headers.Authorization = `Bearer ${process.env.jwtToken}`

  const options = {
    method: method,
    uri: `${baseUrl}/${route}`,
    headers: headers,
    body: body,
    json: typeof body === 'object'
  }

  logger.verbose(`${method} to '${route}'`)
  logger.debug(headers)
  logger.debug(JSON.stringify(body, null, 1))

  return request(options)
}

exports.getMessage = (id, fields) => {
  const json = {
    query: graphql.getMessage(fields),
    variables: {
      id: id
    }
  }

  return map('annotations', jsonify, pick('message', exports.sendGraphql(json)))
}

exports.sendMessage = (spaceId, content) => {
  logger.verbose(`Sending message to conversation '${spaceId}'`)

  const body = {
    type: 'appMessage',
    version: '1',
    annotations: []
  }

  // determine the type of content the user is tying to send
  const type = typeof content
  switch (type) {
    case 'string':
      body.annotations.push(ui.message(content))
      break
    case 'object':
      if (Array.isArray(content)) {
        body.annotations = content
      } else {
        body.annotations = [content]
      }
      break
    default:
      logger.error(`Error sending message of type '${type}'`)
  }

  return exports.sendRequest(`v1/spaces/${spaceId}/messages`, 'POST', {}, body)
}

exports.addMessageFocus = (message, phrase, lens, category, actions, payload) => {
  let id
  let pos = -1

  if (message.id) {
    id = message.id
  } else {
    id = message.messageId
  }

  // the message's content differs based on how the message was created
  if (message.annotations && message.annotations[0].type === 'generic') {
    // app created
    pos = message.annotations[0].text.indexOf(phrase)
  } else {
    // user created
    pos = message.content.indexOf(phrase)
  }

  logger.info(`Adding message focus to message '${id}'`)

  const json = {
    query: graphql.addMessageFocus,
    variables: {
      input: {
        messageId: id,
        messageFocus: {
          phrase: phrase,
          lens: lens,
          category: category,
          actions: actions,
          confidence: 0.99,
          payload: payload,
          start: pos,
          end: pos + phrase.length,
          version: 1,
          hidden: false
        }
      }
    }
  }

  return exports.sendGraphql(json)
}

exports.sendTargetedMessage = (userId, annotation, items) => {
  logger.info(`Sending targetted message to user ${userId}`)

  const input = {
    conversationId: annotation.conversationId,
    targetUserId: userId,
    targetDialogId: annotation.targetDialogId
  }

  if (!Array.isArray(items)) {
    items = [items]
  }

  // check the type of user interface
  if (items[0].genericAnnotation) {
    // TODO allow an array of UI elements?
    input.annotations = items
  } else {
    // TODO allow an array of UI elements?
    input.attachments = items
  }

  const json = {
    query: graphql.createTargetedMessage,
    variables: {
      input: input
    }
  }

  return exports.sendGraphql(json)
}

exports.ui = ui
