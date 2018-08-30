'use strict'

let TimeError = require("./TimeError")

function insertRecord() {
  let db = require('../lib/db')()
  let data = {
    name: this.name,
    parent_id: this.props.parent_id
  }
  return db.insert(data).into('category')
  .then(results => {
    this.id = results[0]
    return this
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

async function fetchRecord(id) {
  let data;
  try {
    data = await require('../lib/db')().select(
      'id', // To avoid adding to data later
      'parent_id',
      'name'
    ).from('category')
    .where('id', id)
    .limit(1)
  } catch (error) {
    return Promise.reject(TimeError.Data.BAD_CONNECTION)
  }

  if (data.length == 0) {
    return Promise.reject(TimeError.Data.NOT_FOUND)
  }

  return data[0]
}

module.exports = class Category {

  get name() { return this.props.name }
  set name(newName) {
    this._modifiedProps.push("name")
    this.props.name = newName
  }

  constructor(data = {})  {
    this._modifiedProps = []

    this.id = data.id
    this.props = {
      parent_id: data.parent_id,
      name: data.name
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
    let objectData = await fetchRecord(id)
    return new Category(objectData)
  }
}
