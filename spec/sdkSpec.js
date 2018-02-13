describe('watsonworkspace-sdk', function () {
  jasmine.DEFAULT_TIMEOUT_INTERVAL = 15000

  require('dotenv').config()

  const spaceId = process.env.SPEC_SPACE_ID
  
  const SDK = require('../index')
  SDK.level(process.env.SPEC_LOGGER_LEVEL)

  // an app such as a chatbot
  const ww = new SDK(
    process.env.APP_ID,
    process.env.APP_SECRET
  )

  it('authenticate', function (done) {
    ww.authenticate()
    .then(token => expect(token).not.toBe(null))
    .catch(error => expect(error).toBeUndefined())
    .finally(() => done())
  })

  it('sendGraphql', function (done) {
    ww.sendGraphql(`query getSpace { space(id: "${spaceId}") { title }}`)
    .then(data => expect(data.space.title).toBeDefined())
    .catch(error => expect(error).toBeUndefined())
    .finally(() => done())
  })

  it('getSpace', function (done) {
    ww.getSpace(spaceId, ['title'])
    .then(space => expect(space.title).toBeDefined())
    .catch(error => expect(error).toBeUndefined())
    .finally(() => done())
  })

  var messageId

  it('sendMessage', function (done) {
    ww.sendMessage(spaceId, 'Hello from *Watson Workspace* SDK. I feel great. How about you?')
    .then(message => {
      messageId = message.id
      expect(message).not.toBe(null)
    })
    .catch(error => expect(error).toBeUndefined())
    .finally(() => done())
  })

  var theMessage = {}

  it('getMessage', function (done) {
    ww.getMessage(messageId, [
      'id',
      'created',
      'annotations',
      'content',
      {
        name: 'createdBy',
        fields: ['id', 'displayName']
      }
    ])
    .then(message => {
      theMessage = message
      expect(message).not.toBe(null)
      expect(message.id).toBe(messageId)
      expect(message.annotations.length).toBeGreaterThan(0) // at least the generic
    })
    .catch(error => expect(error).toBeUndefined())
    .finally(() => done())
  })

  it('informationExtraction', function (done) {
    // wait 10 seconds to allow WWS to add the annotations
    setTimeout(() => {
      ww.getMessage(messageId, [
        'id',
        'created',
        'annotations',
        'content',
        {
          name: 'createdBy',
          fields: ['id', 'displayName']
        }
      ])
      .then(message => {
        const ie = ww.extractInformation(message)

        // these are just the ones expected (it is not exhaustive)
        expect(ie.concepts.length).toBeGreaterThan(0)
        expect(ie.keywords.length).toBeGreaterThan(0)
        expect(ie.taxonomy.length).toBeGreaterThan(0)
        expect(ie.docSentiment.type).not.toBe(null)
      })
      .catch(error => expect(error).toBeUndefined())
      .finally(() => done())
    }, 10000)
  })

  it('addMessageFocus', function (done) {
    ww.addMessageFocus(theMessage, 'SDK', 'Unit Test', 'addMessageFocus', 'sdk-action', '')
    .then(message => {
      expect(message).not.toBe(null)
    })
    .catch(error => expect(error).toBeUndefined())
    .finally(() => done())
  })

  it('sendFile', function (done) {
    ww.sendFile(spaceId, __filename)
    .then(message => {
      expect(message).not.toBe(null)
      expect(message.id).not.toBe(null)
    })
    .catch(error => expect(error).toBeUndefined())
    .finally(() => done())
  })

})
