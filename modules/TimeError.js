// Data Errors
const NOT_FOUND = new Error("Not Found")
const BAD_CONNECTION = new Error("Bad Connection")

// Request Errors
const INVALID_TYPE = new Error("Action not permitted for type")
const INVALID_STATE = new Error("Action is not currently allowed")
const INVALID_ACTION = new Error("Action is unavailable")

module.exports = {
  Data: {
    NOT_FOUND,
    BAD_CONNECTION
  },
  Request: {
    INVALID_TYPE,
    INVALID_STATE,
    INVALID_ACTION
  }
}
