'use strict'

module.exports = (config) => {
  if (typeof config == 'undefined') config = {};

  return {
    Type: require('./modules/Type')
  }
}
