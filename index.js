'use strict'

/**
 * Watson Work Services SDK
 * @module watsonworkspace-sdk
 */

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

// controls the request-promise logging level; logs the raw req/res data
require('request-debug')(request, (type, data, r) => {
  if (logger.level === 'debug') {
    logger.debug(JSON.stringify(data, null, 2))
  }
})

/**
 * A Watson Work Services App (SDK instance).
 * @class
 */
module.exports = class SDK extends EventEmitter {
  constructor (appId, appSecret, token) {
    super()

    this.appId = appId
    this.appSecret = appSecret
    this.token = token
  }

  /**
   * Picks an object from server response, which is a Promise. If a response is { space : {displayName: "foo"} },
   * pick('space') returns {displayName: "foo"}.
   * @param {string} property Fields returned in user informatation e.g. id, displayName, email
   * @returns {Promise<Object>} Promise containing the picked object
   */
  pick (property, promise) {
    return new Promise((resolve, reject) => {
      promise.then(response => {
        // guard against the response being a raw string
        if (typeof response === 'string') {
          logger.warn(`Can not find '${property}'; converting to JSON`)
          response = JSON.parse(response) // convert to JSON for picking
        }

        // check if the property is present
        if(response[property] === undefined) {
          console.error(`No '${property}' field in ${JSON.stringify(response, null, 2)}`)
        }

        resolve(response[property])
      })
      .catch(err => reject(err))
    })
  }

  /**
   * Fulfills a Promise and calls map() of the items defined by the property.
   * @param {string} property The property containing a collection
   * @param {function} fn The function to apply in map()
   * @param {Promise<Object>} promise Promise returned from a server response
   * @returns {Promise<Object>} Promise containing the updated data
   */
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

  /**
   * Converts a JSON string to an object.
   * @param {string} obj String to convert
   * @returns {Object} Converted object
   */
  jsonify (obj) {
    return JSON.parse(obj)
  }

  /**
   * Authenticates the SDK with Watson Work Services. The resulting JWT token will be stored
   * for subsequent use. The token can be obtained from the Promise, but it is not necessary.
   * If a faiure occurs, the process will re-attempt every second for ten tries.
   * The JWT token will be refreshed automatically based on the expiration set in the response.
   * @returns {Promise<string>} Promise containing the app's JWT token
   */
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
              logger.verbose('Refreshed access token')
            }

            this.token = token()
            resolve(token())
          })
      }
    })
  }

  /**
   * Sends GraphQL to Watson Work Services. The GraphQL can either be the raw string or JSON format.
   * @param {string|Object} graphql The GraphQL query or mutation
   * @returns {Promise<Object>} Promise containing the server response
   */
  sendGraphql (graphql) {
    const headers = {
      'Content-Type': typeof graphql === 'string' ? 'application/graphql' : 'application/json',
      'x-graphql-view': 'PUBLIC, BETA, EXPERIMENTAL'
    }

    return this.pick('data', this.sendRequest(`graphql`, 'POST', headers, graphql))
  }

  /**
   * Sends a request to Watson Work Services.
   * If a POST body is set, it will be checked whether it is a string or Object.
   * If the body is an Object, the response is assumed to also be JSON.
   * @param {string} route The route e.g. spaces
   * @param {string} method HTTP method e.g. GET or POST
   * @param {Object} headers HTTP headers
   * @param {string|Object} [body] Optional HTTP body if POSTing
   * @returns {Promise<Object>} Promise containing the server response
   */
  sendRequest (route, method, headers, body) {
    // add the auth header for convenience
    headers.Authorization = `Bearer ${this.token}`

    const options = {
      method: method,
      uri: `${baseUrl}/${route}`,
      headers: headers,
      body: body,
      json: (typeof body) === 'object',
      resolveWithFullResponse: false
    }

    logger.verbose(`${method} to '${route}'`)

    return request(options)
  }

  /**
   * Retrieves user configuration data.
   * @param {string} configurationToken The configuration token sent by Watson Work Services 
   * @returns {Promise<Object>} Promise containing the configuration data
   */
  getConfigurationData (configurationToken) {
    return this.sendRequest(
      `v1/apps/${this.appId}/configurationData/${configurationToken}`, 'GET', {})
  }

  /**
   * Get information about a person.
   * @param {string[]} fields Fields returned in user informatation e.g. id, displayName, email
   * @returns {Promise<Object>} Promise containing the person object
   */
  getMe (fields) {
    const json = {
      query: graphql.getMe(fields)
    }

    return this.pick('me', this.sendGraphql(json))
  }

  /**
   * Get information about a message.
   * @param {string} id Message ID e.g. 5a79f65de4b0d880b508ed57
   * @param {string[]} fields Fields returned in the message e.g. id, content, annotations
   * @returns {Promise<Object>} Promise containing the message object
   */
  getMessage (id, fields) {
    const json = {
      query: graphql.getMessage(fields),
      variables: {
        id: id
      }
    }

    return this.map('annotations', this.jsonify, this.pick('message', this.sendGraphql(json)))
  }

  /**
   * Get information about a space such as membership.
   * @param {string} id Space ID e.g. 57cf270ee4b06c8b753629e6
   * @param {string[]} fields Fields returned in space informatation
   * @returns {Promise<Object>} Promise containing the space object
   */
  getSpace (id, fields) {
    const json = {
      query: graphql.getSpace(fields),
      variables: {
        id: id
      }
    }

    return this.pick('space', this.sendGraphql(json))
  }

  /**
   * Download a file 
   * @param {*} fileId 
   * @returns {Promise<Object>} Promise containing the file stream
   */
  getFile (fileId) {
    return new Promise((resolve, reject) => {
      let uri = `${baseUrl}/files/api/v1/files/file/${fileId}`;
      let options = {
        method: 'GET',
        uri: uri,
        headers: {
          Authorization: `Bearer ${this.token}`
        }
      };
      request(options)
      .then(result => {
        let json = JSON.parse(result)
        let resourceurl = json.entries[0].urls.redirect_download
        const dlResourceOptions = {
          url: resourceurl,
          headers: {
            Authorization: `Bearer ${this.token}`
          },
          encoding: null
        }
        request(dlResourceOptions)
        .then(body => {
          resolve(body)
        })
        .catch(err => {
          reject(err)
        });
      })
      .catch(err => {
        reject(err)
      });
    }); 
  }

  /**
   * Sends a file into a space. If the file is an image, the width and height can
   * be optionally specified. If omitted, the width and height will reflect the
   * full size. For all other files, the mime-type will inferred on a best effort.
   * @param {string} spaceId Space ID e.g. 57cf270ee4b06c8b753629e6
   * @param {string} file Full path to the file
   * @param {number} [width] Optional width to set if file is an image
   * @param {number} [height] Optional height to set if file is an image
   * @returns {Promise<Object>} Promise containing the space object
   */
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

    return request(options)
  }

  /**
   * Sends a text message into a space.
   * @param {string} spaceId Space ID e.g. 57cf270ee4b06c8b753629e6
   * @param {string|Object|Array} content Content to be sent
   * @returns {Promise<Object>} Promise containing the message
   */
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

  /**
   * An alternative way to send a text message to a space.
   * @param {string} spaceId Space ID e.g. 57cf270ee4b06c8b753629e6
   * @param {string} content Content to be sent
   * @returns {Promise<Object>} Promise containing the message
   */
  sendSynchronousMessage (spaceId, content) {
    const json = {
      query: graphql.createSynchronousMessage,
      variables: {
        input: {
          conversationId: spaceId,
          content: content
        }
      }
    }

    return this.sendGraphql(json)
  }

  /**
   * Adds a member to a space.
   * @param {} spaceId Space ID e.g. 57cf270ee4b06c8b753629e6
   * @param {string[]} memberIds Array of member IDs e.g. 3c845f47-c56a-4ca9-a1cb-12dbebd72c3b
   * @returns {Promise<Object>} Promise containing the updated space
   */
  addMember (spaceId, memberIds) {
    const json = {
      query: graphql.addMember,
      variables: {
        input: {
          id: spaceId,
          members: memberIds,
          memberOperation: 'ADD'
        }
      }
    }

    return this.pick('updateSpace', this.sendGraphql(json))
  }

  /**
   * Adds a focus to a specific message. The message must contain content.
   * If the message is obtained from getMessage(), ensure the content field is set.
   * @param {Object} message The message returned from getMessage() or a webhook
   * @param {string} phrase The phrase to add the message (it must be present in content)
   * @param {string} lens The lens name to be added
   * @param {string} category The category for the lens
   * @param {string[]} actions The actions that can be taken e.g. ['commit-code']
   * @param {*} [payload] Data to be persisted in the focus and passed to receivers
   * @param {*} [hidden] True if hidden from Moments
   * @returns {Promise<Object>} Promise containing the updated message
   */
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

    logger.verbose(`Adding message focus to message '${id}'`)

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

  /**
   * Sends a targetted message (action fulfillment) to a user.
   * @param {string} userId The user's ID e.g. 3c845f47-c56a-4ca9-a1cb-12dbebd72c3b
   * @param {Object} annotation The annotation obtained from the 'actionSelected' event 
   * @param {Object[]} items UI items to be added to the resulting dialog
   * @returns {Promise<Object>} Promise containing the updated message
   */
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

  /**
   * Extracts the AlchemyAPI data (i.e. entities, keywords, concepts, ...) into a
   * single object.
   * @param {Object} message Message containing annotation data
   * @returns {Object} Object containing AlchemyAPI data
   */
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

  /**
   * Uploads a JPEG photo to a user's or app's profile.
   * @param {string} file The full path to the file.
   * @returns {Promise<Object>} Promise containing the server response
   */
  uploadPhoto (file) {
    let uri = `${baseUrl}/photos/`

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
            contentType: 'image/jpeg'
          }
        }
      }
    }

    return request(options)
  }
}

/**
 * Sets the debug level. If 'debug' is used, request/response debug will be set.
 * @param {string} level Level for debug e.g. error, info, warn, verbose, debug
 */
module.exports.level = level => {
  logger.level = level
}

/**
 * A user interface helper for sendTargetedMessage(). 
 */
module.exports.UI = ui
