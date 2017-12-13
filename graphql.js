function toString (fields) {
  return fields.reduce((accumulator, currentValue) => {
    switch (typeof currentValue) {
      // if the field is a string, use as-is
      case 'string':
        return accumulator + ' ' + currentValue
      case 'object':
        return accumulator + ` ${currentValue['name']} { ${toString(currentValue['fields'])}}`
    }
  })
}

exports.addMessageFocus = `mutation AddMessageFocus($input: AddFocusInput!) {
  addMessageFocus(input: $input) {
      message {
        id
        annotations
      }
    }
  }
}`

exports.createSynchronousMessage = `mutation createMessage($input: CreateMessageInput!) {
  createMessage(input: $input) {
    message {
      id
    }
  }
}
`

exports.createTargetedMessage = `mutation CreateTargetedMessage($input: CreateTargetedMessageInput!) {
  createTargetedMessage(input: $input) {
    successful
  }
}
`

exports.getMe = (fields) => {
  return `query GetMe {
    me {
      ${toString(fields)}
    }
  }`
}

exports.getMessage = (fields) => {
  // TODO make sure the id field is always present
  return `query GetMessage($id: ID!) {
    message(id: $id) {
      ${toString(fields)}
    }
  }`
}
