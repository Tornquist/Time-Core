'use strict'

let TimeError = require("./TimeError")

module.exports = class Category {

  get name() { return this.props.name }

  constructor(data = {})  {
    this.id = data.id
    this.props = {
      parent_id: data.parent_id,
      name: data.name
    }
  }

  static async fetch(id) {
    let objectData = {}
    try {
      let data = await require('../lib/db')().select(
        'parent_id',
        'name'
      ).from('category')
      .where('id', id)
      .limit(1)

      if (data.length == 0) {
        return Promise.reject(TimeError.Data.NOT_FOUND)
      }

      let objectData = data[0]
    } catch (error) {
      return Promise.reject(TimeError.Data.BAD_CONNECTION)
    }

    return new Category(objectData)
  }
}
