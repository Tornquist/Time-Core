'use strict'

const TimeError = require('./TimeError')
const Type = require('./Type')

const dateHelper = require('../helpers/date')
const arrayHelper = require('../helpers/array')

let timezoneStore = {}
async function getTimezoneID(name) {
  if (name === null) { return null }
  if (timezoneStore[name] !== undefined) { return timezoneStore[name] }

  let db = require('../lib/db')()
  let match = await db('timezone').select('id').where('name', name)
  if (match.length === 1) {
    let id = match[0].id
    timezoneStore[name] = id
    return id
  }

  let newID = await db('timezone').insert({ name })
  if (newID.length !== 1) throw TimeError.Data.NOT_FOUND
  timezoneStore[name] = newID[0]
  return newID[0]
}

async function insertRecord() {
  let db = require('../lib/db')()

  if (
    this.props.category_id === undefined ||
    this.props.type === undefined
  ) throw TimeError.Request.INVALID_STATE

  if (this.props.started_at === undefined) this.start()

  let started_at_timezone_id = await getTimezoneID(this.props.started_at_timezone)
  let ended_at_timezone_id = await getTimezoneID(this.props.ended_at_timezone)

  let data = {
    type_id: db.raw('(select id from entry_type where name = ?)', this.props.type),
    category_id: this.props.category_id,
    started_at: dateHelper.toDb(this.props.started_at),
    started_at_timezone_id: started_at_timezone_id,
    ended_at: dateHelper.toDb(this.props.ended_at),
    ended_at_timezone_id: ended_at_timezone_id
  }
  return db('entry').insert(data)
  .then(results => {
    this.id = results[0]
    this._modifiedProps = []
    return this
  })
}

async function updateRecord() {
  let db = require('../lib/db')()
  let data = {}

  if (this._modifiedProps.includes('type')) {
    data.type_id = db.raw('(select id from entry_type where name = ?)', this.props.type)
    this._modifiedProps = arrayHelper.removeAll(this._modifiedProps, 'type')
  }

  if (this._modifiedProps.includes('started_at')) {
    data.started_at = dateHelper.toDb(this.props.started_at)
    this._modifiedProps = arrayHelper.removeAll(this._modifiedProps, 'started_at')
  }

  if (this._modifiedProps.includes('started_at_timezone')) {
    data.started_at_timezone_id = await getTimezoneID(this.props.started_at_timezone)
    this._modifiedProps = arrayHelper.removeAll(this._modifiedProps, 'started_at_timezone')
  }

  if (this._modifiedProps.includes('ended_at')) {
    data.ended_at = dateHelper.toDb(this.props.ended_at)
    this._modifiedProps = arrayHelper.removeAll(this._modifiedProps, 'ended_at')
  }

  if (this._modifiedProps.includes('ended_at_timezone')) {
    data.ended_at_timezone_id = await getTimezoneID(this.props.ended_at_timezone)
    this._modifiedProps = arrayHelper.removeAll(this._modifiedProps, 'ended_at_timezone')
  }

  this._modifiedProps.forEach(prop => {
    data[prop] = this.props[prop]
  })
  return db('entry').update(data).where('id', this.id)
  .then(updated => {
    this._modifiedProps = []
    return this
  })
}

async function fetchRecords(filters, limit = null) {
  let db = require('../lib/db')()

  if (filters.id !== undefined) {
    filters['entry.id'] = filters.id
    delete filters.id
  }
  if (filters.type !== undefined) {
    filters['type_id'] = db.raw('(select id from entry_type where name = ?)', filters.type)
    delete filters.type
  }

  let accountFilter = null;
  if (filters.account_id !== undefined || filters.account_ids !== undefined) {
    accountFilter = [filters.account_id].concat(filters.account_ids || []).filter(x => !!x)
    delete filters.account_id
    delete filters.account_ids
  }

  let categoryFilter = null;
  if (filters.category_id !== undefined || filters.category_ids !== undefined) {
    categoryFilter = [filters.category_id].concat(filters.category_ids || []).filter(x => !!x)
    delete filters.category_id
    delete filters.category_ids
  }

  let greaterThanFilter = null;
  if (filters.after !== undefined) {
    greaterThanFilter = dateHelper.toDb(filters.after)
    delete filters.after
  }

  let lessThanFilter = null;
  if (filters.before !== undefined) {
    lessThanFilter = dateHelper.toDb(filters.before)
    delete filters.before
  }

  let data;
  try {
    let query = db.select(
      'entry.id', // To avoid adding to data later
      'entry_type.name as type',
      'category_id',
      'started_at',
      'tz_start.name as started_at_timezone',
      'ended_at',
      'tz_end.name as ended_at_timezone',
    ).from('entry')
    .leftJoin('entry_type', 'entry_type.id', 'entry.type_id')
    .leftJoin('timezone as tz_start', 'tz_start.id', 'entry.started_at_timezone_id')
    .leftJoin('timezone as tz_end', 'tz_end.id', 'entry.ended_at_timezone_id')

    if (accountFilter !== null) {
      query = query.leftJoin('category', 'category.id', 'entry.category_id')
                   .leftJoin('account', 'account.id', 'category.account_id')
    }

    if (Object.keys(filters).length > 0)
      query = query.where(filters)
    if (accountFilter !== null)
      query = query.whereIn('account.id', accountFilter)
    if (categoryFilter !== null)
      query = query.whereIn('entry.category_id', categoryFilter)
    if (greaterThanFilter !== null)
      query = query.where('started_at', '>', greaterThanFilter)
    if (lessThanFilter !== null)
      query = query.where('started_at', '<', lessThanFilter)

    if (limit !== null)
      query = query.limit(+limit)

    data = await query
  } catch (error) {
    return Promise.reject(TimeError.Data.BAD_CONNECTION)
  }

  return data
}

module.exports = class Entry {
  get categoryID() {
    return this.props.category_id
  }
  set category(newCategory) {
    this._modifiedProps.push("category_id")
    let category_id = typeof newCategory === "object" ? newCategory.id : newCategory
    this.props.category_id = category_id
  }

  get type() {
    return this.props.type
  }
  set type(newType) {
    // Clear end date when changing from range to entry
    if (this.type === Type.Entry.RANGE && newType !== Type.Entry.RANGE) {
      this.endedAt = null
    }

    this._modifiedProps.push("type")
    this.props.type = newType
  }

  get startedAt() {
    return dateHelper.fromDb(this.props.started_at)
  }
  set startedAt(newStart) {
    if (this.type === undefined) throw TimeError.Request.INVALID_STATE

    this.props.started_at = newStart
    this._modifiedProps.push("started_at")
    if (newStart === null) this.startedAtTimezone = null
  }

  get startedAtTimezone() {
    return this.props.started_at_timezone
  }
  set startedAtTimezone(newTimezone) {
    this.props.started_at_timezone = newTimezone
    this._modifiedProps.push("started_at_timezone")
  }

  get canSetEndedAt() {
    return (!(
      this.type === undefined ||
      this.type === Type.Entry.EVENT ||
      (
        this.type === Type.Entry.RANGE &&
        this.props.started_at === undefined
      )
    ))
  }

  get endedAt() {
    return dateHelper.fromDb(this.props.ended_at)
  }
  set endedAt(newEnd) {
    if (!this.canSetEndedAt) throw TimeError.Request.INVALID_STATE

    this.props.ended_at = newEnd
    this._modifiedProps.push("ended_at")
    if (newEnd === null) this.endedAtTimezone = null
  }

  get endedAtTimezone() {
    return this.props.ended_at_timezone
  }
  set endedAtTimezone(newTimezone) {
    if (!this.canSetEndedAt) throw TimeError.Request.INVALID_STATE

    this.props.ended_at_timezone = newTimezone
    this._modifiedProps.push("ended_at_timezone")
  }

  constructor(data = {}) {
    this._modifiedProps = []

    this.id = data.id
    this.props = {
      type: data.type,

      category_id: data.category_id || data.categoryID,

      started_at: data.started_at,
      started_at_timezone: data.started_at_timezone || null,
      ended_at: data.ended_at,
      ended_at_timezone: data.ended_at_timezone || null
    }
  }

  start(timezone = null) {
    this.startedAt = Date.now()
    if (timezone) this.startedAtTimezone = timezone
  }

  stop(timezone = null) {
    this.endedAt = Date.now()
    if (timezone) this.endedAtTimezone = timezone
  }

  save() {
    let neverSaved = this.id == null
    let updatedFields = this._modifiedProps.length > 0

    if (!(neverSaved || updatedFields)) { return this }

    return neverSaved ?
      insertRecord.bind(this)() :
      updateRecord.bind(this)()
  }

  async delete() {
    let db = require('../lib/db')()
    await db('entry').where('id', this.id).del()
  }

  static async fetch(id) {
    let objectData = await fetchRecords({ id }, 1)
    if (objectData.length == 0) {
      return Promise.reject(TimeError.Data.NOT_FOUND)
    }
    return new Entry(objectData[0])
  }

  static async findFor(search) {
    if (search.category || search.categories) {
      let categories = [search.category].concat(search.categories || []).filter(x => !!x)
      search.category_ids = categories.map(c => c.id)
      delete search.category
      delete search.categories
    }
    if (search.account || search.accounts) {
      let accounts = [search.account].concat(search.accounts || []).filter(x => !!x)
      search.account_ids = accounts.map(c => c.id)
      delete search.account
      delete search.accounts
    }

    Object.keys(search).forEach(key => {
      if (key.endsWith('ID') || key.endsWith('IDs')) {
        search[key.replace('ID', '_id')] = search[key]
        delete search[key]
      }
    })

    let records = await fetchRecords(search)
    return records.map(record => new Entry(record))
  }

  static async startFor(category, timezone = null) {
    let matches = await Entry.findFor({
      category: category,
      type: Type.Entry.RANGE,
      ended_at: null
    })

    if (matches.length !== 0) throw TimeError.Request.INVALID_ACTION

    let entry = new Entry()
    entry.type = Type.Entry.RANGE
    entry.category = category
    entry.start()
    if (timezone) entry.startedAtTimezone = timezone
    await entry.save()

    return entry
  }

  static async stopFor(category, timezone = null) {
    let matches = await Entry.findFor({
      category: category,
      type: Type.Entry.RANGE,
      ended_at: null
    })

    if (matches.length !== 1) throw TimeError.Request.INVALID_ACTION

    let entry = matches[0]
    entry.stop()
    if (timezone) entry.endedAtTimezone = timezone
    await entry.save()

    return entry
  }

  static async logFor(category, timezone = null) {
    let entry = new Entry()
    entry.type = Type.Entry.EVENT
    entry.category = category
    if (timezone) entry.startedAtTimezone = timezone
    await entry.save()

    return entry
  }
}
