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

exports.card = (title, subtitle, text, buttons, date) => {
  if (title === undefined || subtitle === undefined || text === undefined) {
    throw Error(`Card does not contain required information title '${title}', subtitle '${subtitle}', text '${text}'`)
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

exports.cardButton = (text, payload, secondary) => {
  if (text === undefined) {
    throw Error(`Button does not contain required information text '${text}'`)
  }

  return {
    text: text,
    payload: payload || '',
    style: secondary ? 'SECONDARY' : 'PRIMARY'
  }
}

exports.generic = (title, text, buttons) => {
  return {
    genericAnnotation: {
      title: title,
      text: text,
      buttons: buttons || []
    }
  }
}

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
