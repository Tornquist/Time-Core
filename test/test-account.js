let chai = require('chai');
let chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
let should = chai.should();

const UserHelper = require('./helpers/user')

const config = require('./setup/config')
const Time = require(process.env.PWD)(config)

describe('Account Module', () => {

  let user1 = null, user2 = null;

  before(async () => {
    UserHelper.link(Time)
    user1 = await UserHelper.create()
    user1 = user1.user

    user2 = await UserHelper.create()
    user2 = user2.user
  })

  let account = null;

  describe('Creating a new account', () => {
    it('can be initialized with no data', () => {
      account = new Time.Account()
    })

    it('rejects saving without at least 1 user', () => {
      return account.save()
      .should.be.rejectedWith(Time.Error.Request.INVALID_STATE)
    })

    it('allows registering of a user', () => {
      account.register(user1)

      account.props.userIDs.length.should.eq(1)
      account.props.userIDs.includes(user1.id).should.eq(true)
    })

    it('allows saving after a user has been registered')
  })

  describe('Updating an account', () => {
    it('allows unregistering a user')

    it('can safely unregister a user a second time')

    it('rejects saving when no users are registered')

    it('allows registering a user')

    it('has no action when registering a user again ')

    it('allows saving with one user')

    it('allows registering additional users')

    it('allows saving with multiple users')
  })

  describe('Fetching accounts', () => {
    it('can be fetched by id')

    it('can fetch all belonging to a specific user')

    it('loads all registered users regardless of fetch type')
  })

  after(async () => {
    await UserHelper.cleanup(user1)
    await UserHelper.cleanup(user2)
  })
})
