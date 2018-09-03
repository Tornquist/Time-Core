'use strict'

module.exports = (config) => {
  if (typeof config == 'undefined') config = {};
  require('./lib/config')(config)

  return {
    _db: require('./lib/db')(config.db),

    Error: require('./modules/TimeError'),
    Type: require('./modules/Type'),

    Category: require('./modules/Category'),
    Entry: require('./modules/Entry')
  }
}
