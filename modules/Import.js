'use strict'

const TimeError = require('./TimeError')

const dateHelper = require('../helpers/date')

async function insertRecord() {
  let db = require('../lib/db')()

  if (
    this.props.user_id === undefined ||
    this.props.expected_categories === undefined ||
    this.props.expected_entries === undefined
  ) throw TimeError.Request.INVALID_STATE

  let data = {
    user_id: this.props.user_id,
    expected_categories: this.props.expected_categories,
    imported_categories: 0,
		expected_entries: this.props.expected_entries,
		imported_entries: 0,
    complete: false,
    success: false
  }
  return db('import').insert(data)
  .then(results => {
    this.id = results[0]
    this.props.created_at = new Date()
    this.props.updated_at = new Date()
    return this
  })
}

async function fetchRecords(filters, limit = null) {
  let db = require('../lib/db')()

  let data;
  try {
    let query = db.select(
      'id',
      'created_at',
      'updated_at',
      'user_id',
      'expected_categories',
			'imported_categories',
			'expected_entries',
			'imported_entries',
      'complete',
      'success'
    ).from('import')
   
    if (Object.keys(filters).length > 0)
      query = query.where(filters)

    if (limit !== null)
      query = query.limit(+limit)

    data = await query
    
    data = data.map(d => {
      d.complete = d.complete === 1
      d.success = d.success === 1
      return d
    })
  } catch (error) {
    return Promise.reject(TimeError.Data.BAD_CONNECTION)
  }

  return data
}

module.exports = class Import {
	constructor(data = {}) {
    this.id = data.id
    this.props = {
    	created_at: data.created_at,
    	updated_at: data.updated_at,

    	user_id: data.user_id,
    	
    	expected_categories: data.expected_categories || 0,
    	imported_categories: data.imported_categories || 0,

    	expected_entries: data.expected_entries || 0,
    	imported_entries: data.imported_entries || 0,

      complete: data.complete || false,
      success: data.success || false
    }
  }

  get userID() {
  	return this.props.user_id
  }
  get createdAt() {
    return dateHelper.fromDb(this.props.created_at)
  }
  get updatedAt() {
    return dateHelper.fromDb(this.props.updated_at)
  }
  get expectedCategories() {
  	return this.props.expected_categories
  }
  get importedCategories() {
  	return this.props.imported_categories
  }
  get expectedEntries() {
  	return this.props.expected_entries
  }
  get importedEntries() {
  	return this.props.imported_entries
  }
  get complete() {
  	return this.props.complete === true
  }
  get success() {
  	return this.props.success === true
  }

  save() {
    let neverSaved = this.id == null

    if (!neverSaved) {
    	throw TimeError.Request.INVALID_ACTION
    }

    return insertRecord.bind(this)()
  }

  static async fetch(id) {
    let objectData = await fetchRecords({ id }, 1)
    if (objectData.length == 0) {
      return Promise.reject(TimeError.Data.NOT_FOUND)
    }
    return new Import(objectData[0])
  }

  static async loadInto(user, data = {}) {
  	let userID = (typeof user === "number") ? user : user.id
  	let newImport = new Import({ user_id: userID })
  	await newImport.save()
  	
  	return newImport
  }
}