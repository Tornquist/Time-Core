'use strict'

module.exports = class Category {
  constructor(id = null)  {
    this.stale = id != null
    this.props = {
      id: id || null,
      parent_id: null,
      name: null
    }
  }

  get id() { return this.props.id }
  get name() { return this.props.name }

  async load(refresh = false) {
    let shouldLoad = refresh || this.stale
    let data = await require('../lib/db')().select(
      'parent_id',
      'name'
    ).from('category')
    .where('id', this.id)
    .limit(1)
    if (data.length == 0) {
      return Promise.reject(new Error('Not found'))
    }

    return Promise.resolve()
  }
}
