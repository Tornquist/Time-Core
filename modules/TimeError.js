// Data Errors
const NOT_FOUND = new Error("Not Found")
const BAD_CONNECTION = new Error("Bad Connection")
const INCORRECT_FORMAT = new Error("Provided data did not match expected format")

// Request Errors
const INVALID_TYPE = new Error("Action not permitted for type")
const INVALID_STATE = new Error("Action is not currently allowed")
const INVALID_ACTION = new Error("Action is unavailable")

// Authentication Errors
const INVALID_PASSWORD = new Error("Password did not match")
const UNIQUE_TOKEN_NOT_FOUND = new Error("Unable to find unique token")
const TOKEN_EXPIRED = new Error("Token has expired")
const TOKEN_INVALID = new Error("Token has does not match")

module.exports = {
  Data: {
    NOT_FOUND,
    BAD_CONNECTION,
    INCORRECT_FORMAT
  },
  Request: {
    INVALID_TYPE,
    INVALID_STATE,
    INVALID_ACTION
  },
  Authentication: {
    INVALID_PASSWORD,
    UNIQUE_TOKEN_NOT_FOUND,
    TOKEN_EXPIRED,
    TOKEN_INVALID
  }
}
