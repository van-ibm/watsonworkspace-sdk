exports.button = (id, title, secondary) => {
  return {
    postbackButton: {
      title: title,
      id: id,
      style: secondary ? 'SECONDARY' : 'PRIMARY'
    }
  }
}

exports.card = (title, subtitle, text, buttons, date) => {
  return {
    type: 'CARD',
    cardInput: {
      type: 'INFORMATION',
      informationCardInput: {
        title: title,
        subtitle: subtitle,
        text: text,
        date: date || Date.now().toString(),
        buttons: buttons
      }
    }
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
