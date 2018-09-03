const moment = require('moment')

exports.toDbDate = (nullableDate = null) =>
  (nullableDate !== null) ?
    moment(nullableDate).format('YYYY-MM-DD HH:mm:ss') :
    null

exports.fromDbDate = (date) =>
  date !== null && date !== undefined ?
    moment(date).toDate() :
    null

exports.removeAll = (array, item) =>
  array.filter((e) => e !== item)
