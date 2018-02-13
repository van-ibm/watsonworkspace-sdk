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

/**
 * Checks if the id field is present since this is required for most functions.
 * @param {string[]} fields Fields to check
 */
function hasId (fields) {
  fields.forEach(field => {
    if(field === 'id') {
      return true
    }
  })

  return false
}

/**
 * Ensures the id field is always available.
 * @param {string} fields Fields to check; adds id if not
 */
function guardId (fields) {
  if(!hasId(fields)) {
    fields.push('id')
  }
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
  guardId(fields)

  return `query GetMe {
    me {
      ${toString(fields)}
    }
  }`
}

exports.getMessage = (fields) => {
  guardId(fields)

  return `query GetMessage($id: ID!) {
    message(id: $id) {
      ${toString(fields)}
    }
  }`
}

exports.getSpace = (fields) => {
  guardId(fields)

  return `query GetSpace($id: ID!) {
    space(id: $id) {
      ${toString(fields)}
    }
  }`
}
