# IBM Watson Workspace Javascript SDK

An unofficial IBM Watson Workspace Javascript SDK.

## Usage

Include the SDK using a Node.js require statement, authenticate, and begin running API commands.
API functions return data through [bluebird](http://bluebirdjs.com) promises.

```Javascript
const SDK = require('watsonworkspace-sdk')
const ww = new SDK(
  process.env.APP_ID,
  process.env.APP_SECRET
)

ww.authenticate()
.then(token => {
  ww.sendMessage(spaceId, 'Hello from Watson Workspace SDK')
})
.catch(error => logger.error(error))
```

## API

### Authentication

Authentication is completed using an appId and appSecret.
The resulting JWT token is returned through a promise, but stored as a private property.
You do not need to store the JWT token; it will be automatically used and refreshed by the SDK.

```Javascript
ww.authenticate()
.then(token => ...)
.catch(error => logger.error(error))
```

### Working with messages

Individual messages can be obtained using `getMessage(id, fields)`. Fields correspond to the allowed GraphQL fields per documentation.

```Javascript
ww.getMessage(message.messageId, ['id', 'content', 'annotations'])
.then(message => ...)
```

To send a message into a conversation, use  `sendMessage(spaceId, content)`. If `content` is a string, the message is sent unformatted to the space.

```Javascript
ww.sendMessage(spaceId, 'Hello from Watson Workspace SDK')
.then(message => ...)
```

For more expressive messages, construct the content as an object per the Workspace documentation.

```Javascript
ww.sendMessage(spaceId, {
  "type": "generic",
  "version": "1",

  "color": "#36a64f",
  "title": "Hello world",
  "text": "Hello from a Watson Work Services app",

  "actor": {
    "name": "Frank Adams"
  }
})
.then(message => ...)
```

### Working with action fulfillment

To support action fulfillment, a message must be annotated with the `message-focus` annotation. This can be done using Watson Conversation; see [Make your app cognitive](https://workspace.ibm.com/developer/docs) in documentation. Additionally, you can add a `message-focus` annotation programmatically using `addMessageFocus(message, phrase, lens, category, actions, payload)`.

```Javascript
ww.addMessageFocus(message, 'text to be underlined', 'My Lens', 'Category A', 'my-focus-action', '{foo:bar}'))

```

The `message` argument should be obtained from a `message-created` or `message-annotation-added` event. If you are retrieving a message using `getMessage` ensure that the `id` and `content` fields are returned.  The `content` property is necessary to determine the start and end positions of the `phrase` in the overall content's text.

To handle the newly added lens, use `sendTargetedMessage(userId, annotation, items)`. The `annotation` is the annotationPayload returned by a `actionSelected` `message-annotation-added` event. To make it easier, use the [Watson Workspace Bot Framework](https://github.com/van-ibm/watsonworkspace-bot) to handle and parse such events.

To create the standard title-subtitle-buttons user interface, do the following.

```Javascript
const UI = bot.UI // require('watsonworkspace-sdk').UI

const buttons = [
  UI.button('button-submit', 'Submit')
  UI.button('button-cancel', 'Cancel')
]
const dialog = UI.generic('Your awesome title', 'and slightly smaller but equally good subtitle', buttons)

ww.sendTargetedMessage(userId, annotation, dialog)
```

You can similarly send a card-based user interface.

```Javascript
const cards = [
  UI.card(keyword.text, `${keyword.relevance.toString()} relevance`, '', [
    UI.cardButton('More')
  ], date)
  UI.card(entity.type, `${entity.relevance.toString()} relevance`, entity.text, [], date)
]
ww.sendTargetedMessage(userId, annotation, cards)
```

The `card(title, subtitle, text, buttons, date)` builder takes a bit more information that the `generic(title, text, buttons)` builder, but they're very similar. Depending on which you choose, `sendTargetedMessage` will construct the appropriate action fulfillment dialog.

### Working with raw requests

Obviously not all functionality is presently covered with the SDK.

You can use `sendGraphql(query)` to send GraphQL to Work Services and receive JSON.  The query can either be raw GraphQL as seen in the documentation.

```
query getMessage {
  message(id: "message-id") {
    id
    content
    contentType
    annotations
  }
}
```

You can also send GraphQL JSON objects. Examples can be found in `graphql.js`. This is the default implementation in the SDK. See the `getMessage` function as an example.

Special note: `sendGraphql(query)` will respond to the promise with the value of the `data` property.  Said differntly, GraphQL normally appears as:

```
{
  "data": {
    "message": {
      "id": "59e54851e4b017bb0ba2973c",
      ...
    }
  }
}
```

The promise will receive the `message` object in the above example.

For the lowest level of communication, use `sendRequest(route, method, headers, body)`. The `route` is relative to the base server URL, for example `v1/spaces/${spaceId}/messages`. The authentication header will be automatically added to the `headers` argument; you do not need to add it.

## Testing

A Jasmine test suite is located in the `spec` folder. Run `npm test` to start the test suite.
