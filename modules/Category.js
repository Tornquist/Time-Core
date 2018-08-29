'use strict'

let TimeError = require("./TimeError")

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

    let db = require('../lib/db')()

    let data = {}
    if (neverSaved) {
      data = {
        name: this.name,
        parent_id: this.props.parent_id
      }
    } else {
      this._modifiedProps.forEach(prop => {
        data[prop] = this.props[prop]
      })
    }

    let action = neverSaved ?
      db.insert(data).into('category') :
      db('category').update(data).where('id', this.id)

    return action.then(results => {
      if (neverSaved) {
        this.id = results[0]
      } else {
        this._modifiedProps = []
      }

      return this
    })
  }

  static async fetch(id) {
    let objectData = {}
    try {
      let data = await require('../lib/db')().select(
        'id', // To avoid adding to data later
        'parent_id',
        'name'
      ).from('category')
      .where('id', id)
      .limit(1)

      if (data.length == 0) {
        return Promise.reject(TimeError.Data.NOT_FOUND)
      }

      objectData = data[0]
    } catch (error) {
      return Promise.reject(TimeError.Data.BAD_CONNECTION)
    }

    return new Category(objectData)
  }
}
