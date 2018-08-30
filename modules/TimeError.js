// Data Errors
const NOT_FOUND = new Error("Not Found")
const BAD_CONNECTION = new Error("Bad Connection")

// Request Errors
const INVALID_TYPE = new Error("Action not permitted for type")

module.exports = {
  Data: {
    NOT_FOUND,
    BAD_CONNECTION
  },
  Request: {
    INVALID_TYPE
  }
}
