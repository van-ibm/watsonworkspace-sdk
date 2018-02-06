const logger = require('winston')

/**
 * Converts the fields into a flat list separated by spaces for GraphQL.
 * @param {string[]|Object[]} fields Array of fields to be flattened
 * @returns {string} GraphQL acceptable list
 */
function toString (fields) {
  if (fields === undefined || fields.length === 0) {
    logger.warn('No GraphQL fields requested; only id will be returned')
    fields = ['id'] // add a default so the query succeeds
  }

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

exports.addMember = `mutation addMembers ($input: UpdateSpaceInput!) {
  updateSpace(input: $input) {
    memberIdsChanged
  }
}
`

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

exports.getSpace = (fields) => {
  return `query GetSpace($id: ID!) {
    space(id: $id) {
      ${toString(fields)}
    }
  }`
}
