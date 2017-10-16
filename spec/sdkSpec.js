describe('watsonworkspace-sdk', function () {

  require('dotenv').config()

  const spaceId = '57cf270ee4b06c8b753629e6'
  const ww = require('../index')

  ww.logger.level = 'debug'

  it('authenticate', function (done) {
    ww.authenticate(process.env.APP_ID, process.env.APP_SECRET)
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
    console.log(theMessage)
    ww.addMessageFocus(theMessage, 'SDK', 'Unit Test', 'addMessageFocus', 'sdk-action', '')
    .then(message => {
      expect(message).not.toBe(null)
    })
    .catch(error => expect(error).toBeUndefined())
    .finally(() => done())
  })
})
