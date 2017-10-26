describe('watsonworkspace-sdk', function () {

  require('dotenv').config()

  const spaceId = process.env.SPEC_SPACE_ID
  const SDK = require('../index')
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

  var messageId

  it('sendMessage', function (done) {
    ww.sendMessage(spaceId, 'Hello from Watson Workspace SDK')
    .then(message => {
      messageId = message.id
      expect(message).not.toBe(null)
    })
    .catch(error => expect(error).toBeUndefined())
    .finally(() => done())
  })

  var theMessage

  it('getMessage', function (done) {
    ww.getMessage(messageId, ['id', 'annotations'])
    .then(message => {
      theMessage = message
      expect(message).not.toBe(null)
      expect(message.id).toBe(messageId)
      expect(message.annotations.length).toBeGreaterThan(0) // at least the generic
    })
    .catch(error => expect(error).toBeUndefined())
    .finally(() => done())
  })

  it('addMessageFocus', function (done) {
    ww.addMessageFocus(theMessage, 'SDK', 'Unit Test', 'addMessageFocus', 'sdk-action', '')
    .then(message => {
      expect(message).not.toBe(null)
    })
    .catch(error => expect(error).toBeUndefined())
    .finally(() => done())
  })
})
