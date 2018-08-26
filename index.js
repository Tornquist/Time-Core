'use strict'

module.exports = (config) => {
  if (typeof config == 'undefined') config = {};
  require('./lib/config')(config)

  return {
    _db: require('./lib/db')(config.db),
    Category: require('./modules/Category'),
    Type: require('./modules/Type')
  }
}
