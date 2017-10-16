function toString (fields) {
  return fields.reduce((accumulator, currentValue) => accumulator + ' ' + currentValue)
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

exports.createTargetedMessage = `mutation CreateTargetedMessage($input: CreateTargetedMessageInput!) {
  createTargetedMessage(input: $input) {
    successful
  }
}
`

exports.getMessage = (fields) => {
  // TODO make sure the id field is always present
  return `query GetMessage($id: ID!) {
    message(id: $id) {
      ${toString(fields)}
    }
  }`
}
