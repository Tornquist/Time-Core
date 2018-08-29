'use strict'

module.exports = (config) => {
  if (typeof config == 'undefined') config = {};
  require('./lib/config')(config)

  return {
    _db: require('./lib/db')(config.db),
    Category: require('./modules/Category'),
    Error: require('./modules/TimeError'),
    Type: require('./modules/Type')
  }
}
