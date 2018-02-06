/**
 * Constructs a button for a generic dialog.
 * @param {string} id ID for the button's action
 * @param {string} title Text used as button's title
 * @param {string} [secondary] True if the button is SECONDARY
 * @returns {Object} The button
 */
exports.button = (id, title, secondary) => {
  if (id === undefined || title === undefined) {
    throw Error(`Button does not contain required information id '${id}', title '${title}'`)
  }

  return {
    postbackButton: {
      title: title,
      id: id,
      style: secondary ? 'SECONDARY' : 'PRIMARY'
    }
  }
}

/**
 * Constructs a card for action fulfillment dialog.
 * @param {string} title Text title in the card
 * @param {string} subtitle Text subtitle in the card
 * @param {string} text Text body of the card
 * @param {Object[]} [buttons] Card buttons if applicable
 * @param {number} [date] Date seen on card or current time if omitted 
 */
exports.card = (title, subtitle, text, buttons, date) => {
  if (title === undefined || subtitle === undefined || text === undefined) {
    throw Error(`Card does not contain required information title '${title}', subtitle '${subtitle}', text '${text}'`)
  }

  if (typeof date !== 'number') {
    console.warn('Date should be an integer; attempting to convert')
    date = new Date(date).getTime()
  }

  return {
    type: 'CARD',
    cardInput: {
      type: 'INFORMATION',
      informationCardInput: {
        title: title,
        subtitle: subtitle,
        text: text,
        date: date || Date.now().toString(),
        buttons: buttons || []
      }
    }
  }
}

/**
 * Constructs a button for a card dialog.
 * @param {string} id ID for the button's action
 * @param {string} payload Text data submitted from button
 * @param {string} [secondary] True if the button is SECONDARY
 * @returns {Object} The button
 */
exports.cardButton = (text, payload, secondary) => {
  if (text === undefined) {
    throw Error(`Button does not contain required information text '${text}'`)
  }

  if (payload) {
    if (typeof payload === 'object') {
      payload = JSON.stringify(payload)
    }
  }

  return {
    text: text,
    payload: payload || '',
    style: secondary ? 'SECONDARY' : 'PRIMARY'
  }
}

/**
 * Constructs a plain action fulfillment dialog (the non-card based dialog).
 * @param {string} title The title of the dialog
 * @param {string} text The text contained in the dialog
 * @param {Object[]} [buttons] Non-card buttons if applicable 
 */
exports.generic = (title, text, buttons) => {
  return {
    genericAnnotation: {
      title: title,
      text: text,
      buttons: buttons || []
    }
  }
}

/**
 * Constructs a basic message sent into a space.
 * @param {string} text Text body of the message
 * @param {Object} [options] Additional data for the message e.g. color or actor
 */
exports.message = (text, options) => {
  const annotation = {
    type: 'generic',
    version: '1',
    text: text
  }

  // optional settings
  for (var key in options) {
    // exclude properties from the prototype
    if (options.hasOwnProperty(key)) {
      annotation[key] = options[key]
    }
  }

  return annotation
}
