'use strict'

let TimeError = require("./TimeError")

module.exports = class Account {

  constructor(data = {})  {
    this._modifiedProps = []

    this.id = data.id
    this.props = {}
  }

}
