let chai = require('chai');
let chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
let should = chai.should();

const config = require('./setup/config')
const Time = require(process.env.PWD)(config)

describe('Account Module', () => {
  describe('Creating a new account', () => {
    it('can be initialized with no data')

    it('rejects saving without at least 1 user')

    it('allows registering of a user')

    it('allows saving after a user has been registered')
  })

  describe('Updating an account', () => {
    it('allows unregistering a user')

    it('rejects saving when no users are registered')

    it('allows registering a user')

    it('allows saving with one user')

    it('allows registering additional users')

    it('allows saving with multiple users')
  })

  describe('Fetching accounts', () => {
    it('can be fetched by id')

    it('can fetch all belonging to a specific user')

    it('loads all registered users regardless of fetch type')
  })
})
