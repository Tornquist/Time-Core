let chai = require('chai');
let chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
let should = chai.should();

const UserHelper = require('./helpers/user')

const config = require('./setup/config')
const Time = require(process.env.PWD)(config)

describe('Account Module', () => {

  let user1 = null, user2 = null, user3 = null;

  before(async () => {
    UserHelper.link(Time)
    user1 = await UserHelper.create()
    user1 = user1.user

    user2 = await UserHelper.create()
    user2 = user2.user

    user3 = await UserHelper.create()
    user3 = user3.user
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

      account.userIDs.length.should.eq(1)
      account.userIDs.includes(user1.id).should.eq(true)
    })

    it('allows saving after a user has been registered', async () => {
      await account.save()

      account.id.should.be.a('number')
    })
  })

  describe('Updating an account', () => {
    it('starts with no recorded changes', () => {
      account._addedUsers.length.should.eq(0)
      account._removedUsers.length.should.eq(0)
    })

    describe('Unregistering a user', () => {
      it('allows unregistering a user', () => {
        account.unregister(user1)

        account._addedUsers.length.should.eq(0)
        account._removedUsers.length.should.eq(1)
        account._removedUsers.includes(user1.id)
        account.userIDs.length.should.eq(0)
      })

      it('can safely unregister a user a second time', () => {
        account.unregister(user1)

        account._addedUsers.length.should.eq(0)
        account._removedUsers.length.should.eq(1)
        account._removedUsers.includes(user1.id)
        account.userIDs.length.should.eq(0)
      })

      it('rejects saving when no users are registered', () => {
        return account.save()
        .should.be.rejectedWith(Time.Error.Request.INVALID_STATE)
      })
    })

    describe('Registering a user', () => {
      it('allows registering a user', () => {
        account.register(user2)

        account._addedUsers.includes(user2.id)
        account._addedUsers.length.should.eq(1)
        account._removedUsers.length.should.eq(1)
        account.userIDs.length.should.eq(1)
      })

      it('has no action when registering a user again ', () => {
        account.register(user2)

        account._addedUsers.includes(user2.id)
        account._addedUsers.length.should.eq(1)
        account._removedUsers.length.should.eq(1)
        account.userIDs.length.should.eq(1)
      })

      it('allows saving with one user', async () => {
        await account.save()

        account._addedUsers.length.should.eq(0)
        account._removedUsers.length.should.eq(0)
        account.userIDs.length.should.eq(1)
      })

      it('allows registering additional users', () => {
        account.register(user1)

        account._addedUsers.includes(user1.id)
        account._addedUsers.length.should.eq(1)
        account._removedUsers.length.should.eq(0)
        account.userIDs.length.should.eq(2)
      })

      it('allows saving with multiple users', async () => {
        await account.save()

        account._addedUsers.length.should.eq(0)
        account._removedUsers.length.should.eq(0)
        account.userIDs.length.should.eq(2)
      })
    })

    describe('Reverting changes', () => {
      it('does not need saved when registering and then unregistering', () => {
        account.register(user3)
        account._addedUsers.length.should.eq(1)
        account._removedUsers.length.should.eq(0)

        account.unregister(user3)
        account._addedUsers.length.should.eq(0)
        account._removedUsers.length.should.eq(0)
      })

      it('does not need saved when unregistering and then registering', () => {
        account.unregister(user1)
        account._addedUsers.length.should.eq(0)
        account._removedUsers.length.should.eq(1)

        account.register(user1)
        account._addedUsers.length.should.eq(0)
        account._removedUsers.length.should.eq(0)
      })
    })
  })

  describe('Fetching accounts', () => {
    let secondAccount;
    let fetchedAccounts = []

    before(async () => {
      secondAccount = new Time.Account()
      secondAccount.register(user1)
      await secondAccount.save()
    })

    it('throws for an account id that does not exist', () => {
      return Time.Account.fetch(-1)
      .should.be.rejectedWith(Time.Error.Data.NOT_FOUND)
    })

    it('can be fetched by id', async () => {
      let newAccount = await Time.Account.fetch(account.id)

      newAccount.id.should.eq(account.id)

      fetchedAccounts.push(newAccount)
    })

    it('can fetch all belonging to a specific user', async () => {
      let accounts = await Time.Account.findForUser(user1.id)

      accounts.length.should.eq(2)

      fetchedAccounts = fetchedAccounts.concat(accounts);
    })

    it('loads all registered users regardless of fetch type', () => {
      fetchedAccounts.forEach(fetchedAccount => {
        if (fetchedAccount.id === account.id) {
          fetchedAccount.userIDs.length.should.eq(2)
          fetchedAccount.userIDs.includes(user1.id).should.eq(true)
          fetchedAccount.userIDs.includes(user2.id).should.eq(true)

        } else if (fetchedAccount.id === secondAccount.id) {
          fetchedAccount.userIDs.length.should.eq(1)
          fetchedAccount.userIDs.includes(user1.id).should.eq(true)
          fetchedAccount.userIDs.includes(user2.id).should.eq(false)

        } else {
          throw new Error("Unknown account")
        }
      })
    })

    after(async () => {
      await Time._db('account').where('id', secondAccount.id).del()
    })
  })

  after(async () => {
    await Time._db('account').where('id', account.id).del()
    await UserHelper.cleanup(user1)
    await UserHelper.cleanup(user2)
    await UserHelper.cleanup(user3)
  })
})
