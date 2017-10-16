# IBM Watson Workspace Javascript SDK

An unofficial IBM Watson Workspace Javascript SDK.

## Usage

Include the SDK using Node.js require statements, authenticate, and begin running API commands.

```Javascript
const ww = require('watsonworkspace-sdk')

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
```

If using watsonworkspace-bot, you do not need to authenticate.
