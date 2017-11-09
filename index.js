'use strict'

const EventEmitter = require('events')
const fs = require('fs')
const graphql = require('./graphql')
const imageSize = require('image-size')
const mime = require('mime-types')
const request = require('request-promise')
const logger = require('winston')
const oauth = require('./oauth')
const path = require('path')
const Promise = require('bluebird')
const ui = require('./ui')

const baseUrl = 'https://api.watsonwork.ibm.com'

module.exports = class SDK extends EventEmitter {
  constructor (appId, appSecret) {
    super()

    this.appId = appId
    this.appSecret = appSecret
  }

  pick (property, promise) {
    return new Promise((resolve, reject) => {
      promise.then(response => resolve(response[property]))
      .catch(err => reject(err))
    })
  }

  map (property, fn, promise) {
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

  jsonify (obj) {
    return JSON.parse(obj)
  }

  authenticate () {
    return new Promise((resolve, reject) => {
      const retry = 10000
      let errors = 0

      if (this.appId === undefined || this.appSecret === undefined ||
        this.appId.length !== 36 || this.appSecret.length !== 28) {
        reject(new Error(`appId ${this.appId} or appSecret has a problem`))
      } else {
        oauth.run(
          this.appId,
          this.appSecret,
          (err, token) => {
            if (err) {
              logger.error(`Failed to get JWT token; retrying in ${retry / 1000} seconds`)
              errors++
              if (errors > 10) {
                reject(new Error(`Too many JWT token attempts giving up`))
              }
              setTimeout(this.authenticate, retry)
              return
            }

            if (this.token) {
              logger.info('Refreshed access token')
            }

            this.token = token()
            resolve(token())
          })
      }
    })
  }

  sendGraphql (query) {
    const headers = {
      'Content-Type': typeof query === 'string' ? 'application/graphql' : 'application/json',
      'x-graphql-view': 'PUBLIC, BETA'
    }

    return this.pick('data', this.sendRequest(`graphql`, 'POST', headers, query))
  }

  sendRequest (route, method, headers, body) {
    // add the auth header for convenience
    headers.Authorization = `Bearer ${this.token}`

    const options = {
      method: method,
      uri: `${baseUrl}/${route}`,
      headers: headers,
      body: body,
      json: typeof body === 'object',
      resolveWithFullResponse: false
    }

    logger.verbose(`${method} to '${route}'`)
    logger.debug(options)
    logger.debug(JSON.stringify(body, null, 1))

    return request(options)
  }

  getMessage (id, fields) {
    const json = {
      query: graphql.getMessage(fields),
      variables: {
        id: id
      }
    }

    return this.map('annotations', this.jsonify, this.pick('message', this.sendGraphql(json)))
  }

  sendFile (spaceId, file, width, height) {
    logger.verbose(`Sending file '${file}' to conversation '${spaceId}'`)

    let uri = `${baseUrl}/v1/spaces/${spaceId}/files`

    const mimeType = mime.contentType(path.extname(file))

    if (width && height) {
      uri += `?dim=${width}x${height}`
    } else {
      const isImage = mimeType.toLowerCase().includes('image/')

      if (isImage) {
        // figure out the dimensions and send full size
        const dim = imageSize(file)
        uri += `?dim=${dim.width}x${dim.height}`
      }
    }

    const options = {
      method: 'POST',
      uri: uri,
      headers: {
        Authorization: `Bearer ${this.token}`,
        'content-type': 'multipart/form-data'
      },
      resolveWithFullResponse: false,
      formData: {
        file: {
          value: fs.createReadStream(file),
          options: {
            filename: path.parse(file).base,
            contentType: mimeType
          }
        }
      }
    }

    logger.debug(options)

    return request(options)
  }

  sendMessage (spaceId, content) {
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

    return this.sendRequest(`v1/spaces/${spaceId}/messages`, 'POST', {}, body)
  }

  addMessageFocus (message, phrase, lens, category, actions, payload, hidden) {
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
            payload: payload ? JSON.stringify(payload) : '',
            start: pos,
            end: pos + phrase.length,
            version: 1,
            hidden: hidden || false
          }
        }
      }
    }

    return this.sendGraphql(json)
  }

  sendTargetedMessage (userId, annotation, items) {
    logger.verbose(`Sending targetted message to user ${userId}`)

    const input = {
      conversationId: annotation.conversationId,
      targetUserId: userId,
      targetDialogId: annotation.targetDialogId
    }

    if (!Array.isArray(items)) {
      items = [items]
    }

    if (items.length === 0) {
      logger.error(`Targetted message has no annotations or attachments for ${userId}`)
    }

    // check the type of user interface
    if (items.length && items[0].genericAnnotation) {
      input.annotations = items
    } else {
      input.attachments = items
    }

    const json = {
      query: graphql.createTargetedMessage,
      variables: {
        input: input
      }
    }

    return this.sendGraphql(json)
  }

  extractInformation (message) {
    const messageAnnotations = message.annotations  // already converted to JSON

    const nlp = {
      keywords: [],
      entities: [],
      concepts: [],
      taxonomy: [],
      dates: [],
      docSentiment: {},
      relations: []
    }

    if (messageAnnotations) {
      // pluck out cognitive data
      messageAnnotations.forEach(annotation => {
        const annotationType = annotation.type

        // 'message-nlp-keywords' -> 'keywords'
        const shortened = annotationType.substring(annotationType.lastIndexOf('-') + 1)

        // only handle Alchemy annotations (ie disregard a message-focus)
        if (nlp[shortened]) {
          if (shortened === 'docSentiment') {
            nlp[shortened] = annotation[shortened]
          } else {
            nlp[shortened] = (annotation[shortened])
          }
        }
      })
    } else {
      console.warn(`Information extraction on message with undefined annotations`)
    }

    return nlp
  }
}

module.exports.level = level => {
  logger.level = level
}

module.exports.UI = ui
