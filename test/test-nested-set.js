let chai = require('chai');
let chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
let should = chai.should();

const config = require('./setup/config')
const Time = require(process.env.PWD)(config)

describe('Nested Set Methods (Category SQL Procedures)', () => {

  let accountAID = null;
  let accountARoot = null;

  let accountBID = null;
  let accountBRoot = null;

  let accountCID = null;
  let accountCRoot = null;

  /* Wrapped sql procedures and raw output */
  let category_setup = async (accountID) => {
    let results = await Time._db.raw('CALL category_setup(?)', accountID)
    return results[0][0][0].id
  }

  let category_add = async (accountID, rootID, name) => {
    let results = await Time._db.raw(
      'CALL category_add(?, ?, ?)',
      [accountID, rootID, name]
    );

    return results[0][0][0].id
  }

  /* End wrapped sql */

  before(async () => {
    accountAID = (await Time._db('account').insert({}))[0]
    accountBID = (await Time._db('account').insert({}))[0]
    accountCID = (await Time._db('account').insert({}))[0]
  })

  describe('Configuring Categories', () => {
    it('Can be configured with category_setup()', async () => {
      accountARoot = await category_setup(accountAID)
    })

    it('Can be reconfigured without issue', async () => {
      let secondRoot = await category_setup(accountAID)

      accountARoot.should.eq(secondRoot)
    })

    it('Allows any account to be configured', async () => {
      accountBRoot = await category_setup(accountBID)
      accountCRoot = await category_setup(accountCID)

      accountBRoot.should.be.a('number')
      accountCRoot.should.be.a('number')

      accountBRoot.should.not.eq(accountCRoot)
    })
  })

  describe('Adding Categories', () => {
    it('Allows a category to be added', async () => {
      let newCategoryID = await category_add(accountAID, accountARoot, 'Lemons')
      newCategoryID.should.be.a('number')
    })

    it('Rejects adding a category when the node account and provided account do not match', () => {
       return category_add(accountBID, accountARoot, 'Lemons').should.be.rejected
    })
  })

  after(async () => {
    await Time._db('account').where('id', accountAID).del()
    await Time._db('account').where('id', accountBID).del()
    await Time._db('account').where('id', accountCID).del()
  })
})
