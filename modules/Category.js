'use strict'

let TimeError = require("./TimeError")

function getRootID(accountID) {
  let db = require('../lib/db')()
  return db.select('id')
  .from('category')
  .whereNull('parent_id')
  .andWhere('account_id', accountID)
  .then(results => (results[0] || {}).id)
}

function getAccountID(parentID) {
  let db = require('../lib/db')()
  return db.select('account_id')
  .from('category')
  .where('id', parentID)
  .then(results => (results[0] || {}).account_id)
}

async function insertRecord() {
  let db = require('../lib/db')()

  let parentSet = this.props.parent_id !== undefined
  let accountSet = this.props.account_id !== undefined

  let parentID = this.props.parent_id
  let accountID = this.props.account_id

  if (parentSet && accountSet) {
    // No action: Auto validated in category_add
  } else if (parentSet) {
    accountID = await getAccountID(parentID)
  } else if (accountSet) {
    parentID = await getRootID(accountID)
  } else {
    throw TimeError.Category.INSUFFICIENT_PARENT_OR_ACCOUNT
  }

  return db.raw(
    'CALL category_add(?, ?, ?)',
    [accountID, parentID, this.name]
  )
  .then(results => results[0][0][0].id)
  .then(newID => {
    this.id = newID

    this.props.account_id = accountID
    this.props.parent_id = parentID
    this._modifiedProps = []

    return this
  })
  .catch(err => {
    let consistencyMessage = 'Category with requested parent_id and account_id not found'
    let isInconsistent = err.message.includes(consistencyMessage)
    if (isInconsistent) {
      throw TimeError.Category.INCONSISTENT_PARENT_AND_ACCOUNT
    }
    throw err
  })
}

function updateRecord() {
  let db = require('../lib/db')()
  let data = {}
  this._modifiedProps.forEach(prop => {
    data[prop] = this.props[prop]
  })
  return db('category').update(data).where('id', this.id)
  .then(updated => {
    this._modifiedProps = []
    return this
  })
}

async function fetchRecords(filters, limit = null) {
  let data;
  try {
    let query = require('../lib/db')().select(
      'id', // To avoid adding to data later
      'parent_id',
      'name',
      'account_id'
    ).from('category')
    .where(filters)

    if (limit !== null) {
      query = query.limit(+limit)
    }

    data = await query
  } catch (error) {
    return Promise.reject(TimeError.Data.BAD_CONNECTION)
  }

  return data
}

module.exports = class Category {

  get name() { return this.props.name }
  set name(newName) {
    this._modifiedProps.push("name")
    this.props.name = newName
  }

  get account_id() { return this.props.account_id }
  set account(newAccount) {
    this._modifiedProps.push("account_id")
    let id = (typeof newAccount === "number") ? newAccount : newAccount.id
    this.props.account_id = id
  }

  async getParent() {
    let hasParent = this.props.parent_id !== null
    if (!hasParent) return null

    let fetchedParent = await Category.fetch(this.props.parent_id)
    return fetchedParent
  }
  set parent(newParent) {
    let isCategory = newParent instanceof Category && newParent.id !== undefined
    let isNull = newParent === null
    let isValidNewParent = isCategory || isNull
    if (!isValidNewParent) throw TimeError.Request.INVALID_TYPE

    this.props.parent_id = newParent != null ? newParent.id : null
    this._modifiedProps.push('parent_id')
  }

  async getChildren() {
    let children = await fetchRecords({ parent_id: this.id })
    return children.map(child => new Category(child))
  }

  constructor(data = {})  {
    this._modifiedProps = []

    this.id = data.id
    this.props = {
      parent_id: data.parent_id,
      name: data.name,
      account_id: data.account_id
    }
  }

  save() {
    let neverSaved = this.id == null
    let updatedFields = this._modifiedProps.length > 0

    if (!(neverSaved || updatedFields)) { return this }

    return neverSaved ?
      insertRecord.bind(this)() :
      updateRecord.bind(this)()
  }

  static async fetch(id) {
    let objectData = await fetchRecords({ id }, 1)
    if (objectData.length == 0) {
      return Promise.reject(TimeError.Data.NOT_FOUND)
    }
    return new Category(objectData[0])
  }
}
