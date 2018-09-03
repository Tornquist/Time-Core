const moment = require('moment')

exports.dbDate = (nullableDate = null) =>
  (nullableDate !== null) ?
    moment(nullableDate).format('YYYY-MM-DD HH:mm:ss') :
    null

exports.removeAll = (array, item) =>
  array.filter((e) => e !== item)
