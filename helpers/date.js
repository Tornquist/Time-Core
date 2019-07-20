const moment = require('moment')

exports.toDb = (nullableDate = null) =>
  (nullableDate !== null) ?
    moment.utc(nullableDate).format('YYYY-MM-DD HH:mm:ss') :
    null

exports.fromDb = (date) =>
  date !== null && date !== undefined ?
    moment.utc(date).toDate() :
    null
