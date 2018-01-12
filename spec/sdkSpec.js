describe('watsonworkspace-sdk', function () {
  jasmine.DEFAULT_TIMEOUT_INTERVAL = 15000

  require('dotenv').config()

  const spaceId = process.env.SPEC_SPACE_ID
  const SDK = require('../index')
  SDK.level('debug')

  // an app such as a chatbot
  const ww = new SDK(
    process.env.APP_ID,
    process.env.APP_SECRET
  )

  // an app appearing to be a user possibly
  const me = new SDK('', '', process.env.JWT_TOKEN)

  it('authenticate', function (done) {
    ww.authenticate()
    .then(token => expect(token).not.toBe(null))
    .catch(error => expect(error).toBeUndefined())
    .finally(() => done())
  })

  it('getMe', function (done) {
    me.getMe(['id', 'displayName', 'email'])
    .then(person => expect(person.me.email).toBe('van_staub@us.ibm.com'))
    .catch(error => expect(error).toBeUndefined())
    .finally(() => done())
  })

  it('addMember', function (done) {
    // adds the News app
    me.addMember(spaceId, ['3c845f47-c56a-4ca9-a1cb-12dbebd72c3b'])
    .then(message => {
      console.log(JSON.stringify(message, null, 2))
      expect(message).not.toBe(null)
      expect(message.updateSpace).not.toBe(null)
    })
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

  // EXPERIMENTAL
  it('sendSynchronousMessage', function (done) {
    me.sendSynchronousMessage(spaceId, 'Hello. I should look like a user now.')
    .then(message => {
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
      console.log(JSON.stringify(message))
      expect(message).not.toBe(null)
      expect(message.id).not.toBe(null)
    })
    .catch(error => expect(error).toBeUndefined())
    .finally(() => done())
  })

})
