let chai = require('chai');
let chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
let should = chai.should();

const config = require('./setup/config')
const Time = require(process.env.PWD)(config)

describe('Nested Set Methods (Category SQL Procedures)', () => {

  let ids = {}

  let accountAID = null;
  let accountBID = null;
  let accountCID = null;

  /* Wrapped sql */
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

  let category_move = async (nodeID, parentID) => {
    await Time._db.raw(
      'CALL category_move(?, ?)',
      [nodeID, parentID]
    );
  }

  let category_visualize = async (accountID) => {
    let results = await Time._db.raw('CALL category_visualize(?)', accountID);

    console.log("Tree for Account", accountID)
    results[0][0].forEach(result => {
      console.log(result.name)
    })
  }

  let category_state = async (accountID) => {
    let results = await Time._db.select(
      'id',
      'parent_id',
      'lft',
      'rgt',
      'name'
    ).from('category')
    .where('account_id', accountID)
    return results
  }
  /* End wrapped sql */

  /* Helper Methods */

  let verifyTree = (tree, rules) => {
    tree.length.should.eq(Object.keys(rules).length)

    tree.forEach(entry => {
      Object.keys(rules).includes(entry.name).should.eq(
        true,
        `Category '${entry.name}' was not in the list of expected categories`
      )

      entry.lft.should.eq(rules[entry.name].lft, `Invalid lft value for '${entry.name}'`)
      entry.rgt.should.eq(rules[entry.name].rgt, `Invalid rgt value for '${entry.name}'`)
      should.equal(
        entry.parent_id, rules[entry.name].parent_id,
        `Invalid parent_id for '${entry.name}'`
      )
    })
  }

  /* End helper methods */

  before(async () => {
    accountAID = (await Time._db('account').insert({}))[0]
    accountBID = (await Time._db('account').insert({}))[0]
    accountCID = (await Time._db('account').insert({}))[0]
  })

  describe('Configuring Categories', () => {
    it('Can be configured with category_setup()', async () => {
      ids.accountARoot = await category_setup(accountAID)
    })

    it('Can be reconfigured without issue', async () => {
      let secondRoot = await category_setup(accountAID)

      ids.accountARoot.should.eq(secondRoot)
    })

    it('Allows any account to be configured', async () => {
      ids.accountBRoot = await category_setup(accountBID)
      ids.accountCRoot = await category_setup(accountCID)

      ids.accountBRoot.should.be.a('number')
      ids.accountCRoot.should.be.a('number')

      ids.accountBRoot.should.not.eq(ids.accountCRoot)
    })
  })

  describe('Adding Categories', () => {

    it('Allows a category to be added', async () => {
      let newCategoryID = await category_add(accountAID, ids.accountARoot, 'Lemons')
      newCategoryID.should.be.a('number')

      ids.lemonID = newCategoryID
    })

    it('Rejects adding a category when the node account and provided account do not match', () => {
       return category_add(accountBID, ids.accountARoot, 'Lemons').should.be.rejected
    })

    describe('Updating the tree structure (lft and rgt)', () => {
      it('Starts with the exptected structure', async () => {
        let tree = await category_state(accountAID)

        return verifyTree(tree, {
          'root': { lft: 1, rgt: 4, parent_id: null },
          'Lemons': { lft: 2, rgt: 3, parent_id: ids.accountARoot },
        })
      })

      it('Inserts at the expected position', async () => {
        let newCategoryID = await category_add(accountAID, ids.accountARoot, 'Limes')
        newCategoryID.should.be.a('number')

        ids.limeID = newCategoryID

        let tree = await category_state(accountAID)

        return verifyTree(tree, {
          'root': { lft: 1, rgt: 6, parent_id: null },
          'Lemons': { lft: 2, rgt: 3, parent_id: ids.accountARoot },
          'Limes': { lft: 4, rgt: 5, parent_id: ids.accountARoot }
        })
      })

      it('Inserts children correctly', async () => {
        let newCategoryID = await category_add(accountAID, ids.limeID, 'Oranges')
        newCategoryID.should.be.a('number')

        ids.orangeID = newCategoryID

        let tree = await category_state(accountAID)

        return verifyTree(tree, {
          'root': { lft: 1, rgt: 8, parent_id: null },
          'Lemons': { lft: 2, rgt: 3, parent_id: ids.accountARoot },
          'Limes': { lft: 4, rgt: 7, parent_id: ids.accountARoot },
          'Oranges': { lft: 5, rgt: 6, parent_id: ids.limeID }
        })
      })

      it('Inserts multiple children correctly', async () => {
        ids.aID = await category_add(accountAID, ids.lemonID, 'A')
        ids.bID = await category_add(accountAID, ids.lemonID, 'B')
        ids.cID = await category_add(accountAID, ids.bID, 'C')
        ids.dID = await category_add(accountAID, ids.aID, 'D')
        ids.oneID = await category_add(accountAID, ids.limeID, '1')
        ids.twoID = await category_add(accountAID, ids.oneID, '2')
        ids.threeID = await category_add(accountAID, ids.limeID, '3')
        ids.fourID = await category_add(accountAID, ids.orangeID, '4')

        let tree = await category_state(accountAID)

        return verifyTree(tree, {
          'root': { lft: 1, rgt: 24, parent_id: null },
            'Lemons': { lft: 2, rgt: 11, parent_id: ids.accountARoot },
              'A': { lft: 3, rgt: 6, parent_id: ids.lemonID },
                'D': { lft: 4, rgt: 5, parent_id: ids.aID },
              'B': { lft: 7, rgt: 10, parent_id: ids.lemonID },
                'C': { lft: 8, rgt: 9, parent_id: ids.bID },
            'Limes': { lft: 12, rgt: 23, parent_id: ids.accountARoot },
              'Oranges': { lft: 13, rgt: 16, parent_id: ids.limeID },
                '4': { lft: 14, rgt: 15, parent_id: ids.orangeID },
              '1': { lft: 17, rgt: 20, parent_id: ids.limeID },
                '2': { lft: 18, rgt: 19, parent_id: ids.oneID },
              '3': { lft: 21, rgt: 22, parent_id: ids.limeID }
        })
      })
    })

    describe('Moving categories', () => {
      before(async () => {
        // Initialize Account B
        ids.qID = await category_add(accountBID, ids.accountBRoot, 'Q')
        ids.wID = await category_add(accountBID, ids.accountBRoot, 'W')
        ids.eID = await category_add(accountBID, ids.qID, 'E')
        ids.rID = await category_add(accountBID, ids.accountBRoot, 'R')
        ids.tID = await category_add(accountBID, ids.qID, 'T')
        ids.yID = await category_add(accountBID, ids.wID, 'Y')

        let bTree = await category_state(accountBID)
        verifyTree(bTree, {
          'root': { lft: 1, rgt: 14, parent_id: null },
            'Q': { lft: 2, rgt: 7, parent_id: ids.accountBRoot },
              'E': { lft: 3, rgt: 4, parent_id: ids.qID },
              'T': { lft: 5, rgt: 6, parent_id: ids.qID },
            'W': { lft: 8, rgt: 11, parent_id: ids.accountBRoot },
              'Y': { lft: 9, rgt: 10, parent_id: ids.wID },
            'R': { lft: 12, rgt: 13, parent_id: ids.accountBRoot }
        })

        // Initialize Account C
        ids.hID = await category_add(accountCID, ids.accountCRoot, 'H')
        ids.jID = await category_add(accountCID, ids.accountCRoot, 'J')
        ids.kID = await category_add(accountCID, ids.accountCRoot, 'K')
        ids.lID = await category_add(accountCID, ids.kID, 'L')

        let cTree = await category_state(accountCID)
        verifyTree(cTree, {
          'root': { lft: 1, rgt: 10, parent_id: null },
            'H': { lft: 2, rgt: 3, parent_id: ids.accountCRoot },
            'J': { lft: 4, rgt: 5, parent_id: ids.accountCRoot },
            'K': { lft: 6, rgt: 9, parent_id: ids.accountCRoot },
              'L': { lft: 7, rgt: 8, parent_id: ids.kID }
        })
      })

      describe('Within the same account', () => {
        it('it allows moving a leaf node', async () => {
          // Starts from:
          // Adding Categories
          //   Updating the tree structure (lft and rgt)
          //     Inserts multiple children correctly
          await category_move(ids.fourID, ids.limeID)

          let tree = await category_state(accountAID)
          verifyTree(tree, {
            'root': { lft: 1, rgt: 24, parent_id: null },
              'Lemons': { lft: 2, rgt: 11, parent_id: ids.accountARoot },
                'A': { lft: 3, rgt: 6, parent_id: ids.lemonID },
                  'D': { lft: 4, rgt: 5, parent_id: ids.aID },
                'B': { lft: 7, rgt: 10, parent_id: ids.lemonID },
                  'C': { lft: 8, rgt: 9, parent_id: ids.bID },
              'Limes': { lft: 12, rgt: 23, parent_id: ids.accountARoot },
                '4': { lft: 13, rgt: 14, parent_id: ids.limeID },
                'Oranges': { lft: 15, rgt: 16, parent_id: ids.limeID },
                '1': { lft: 17, rgt: 20, parent_id: ids.limeID },
                  '2': { lft: 18, rgt: 19, parent_id: ids.oneID },
                '3': { lft: 21, rgt: 22, parent_id: ids.limeID }
          })
        })

        it('it allows moving a tree', async () => {
          // Starts from:
          // Moving categories
          //   it allows moving a leaf node within an account

          await category_move(ids.oneID, ids.cID)

          let endingTree = await category_state(accountAID)
          verifyTree(endingTree, {
            'root': { lft: 1, rgt: 24, parent_id: null },
              'Lemons': { lft: 2, rgt: 15, parent_id: ids.accountARoot },
                'A': { lft: 3, rgt: 6, parent_id: ids.lemonID },
                  'D': { lft: 4, rgt: 5, parent_id: ids.aID },
                'B': { lft: 7, rgt: 14, parent_id: ids.lemonID },
                  'C': { lft: 8, rgt: 13, parent_id: ids.bID },
                    '1': { lft: 9, rgt: 12, parent_id: ids.cID },
                      '2': { lft: 10, rgt: 11, parent_id: ids.oneID },
              'Limes': { lft: 16, rgt: 23, parent_id: ids.accountARoot },
                '4': { lft: 17, rgt: 18, parent_id: ids.limeID },
                'Oranges': { lft: 19, rgt: 20, parent_id: ids.limeID },
                '3': { lft: 21, rgt: 22, parent_id: ids.limeID }
          })
        })

        it('it allows moving a tree up (moves to front)', async () => {
          // Starts from:
          // Moving categories
          //   it allows moving a tree within an account

          await category_move(ids.oneID, ids.bID)

          let endingTree = await category_state(accountAID)
          verifyTree(endingTree, {
            'root': { lft: 1, rgt: 24, parent_id: null },
              'Lemons': { lft: 2, rgt: 15, parent_id: ids.accountARoot },
                'A': { lft: 3, rgt: 6, parent_id: ids.lemonID },
                  'D': { lft: 4, rgt: 5, parent_id: ids.aID },
                'B': { lft: 7, rgt: 14, parent_id: ids.lemonID },
                  '1': { lft: 8, rgt: 11, parent_id: ids.bID },
                    '2': { lft: 9, rgt: 10, parent_id: ids.oneID },
                  'C': { lft: 12, rgt: 13, parent_id: ids.bID },
              'Limes': { lft: 16, rgt: 23, parent_id: ids.accountARoot },
                '4': { lft: 17, rgt: 18, parent_id: ids.limeID },
                'Oranges': { lft: 19, rgt: 20, parent_id: ids.limeID },
                '3': { lft: 21, rgt: 22, parent_id: ids.limeID }
          })
        })

        it('it prevents moving a tree to a child in its structure', async () => {
          // Starts from:
          // Moving categories
          //   it allows moving a tree up within an account (moves to front)

          let failureMessage = 'New parent cannot be child of target'

          try {
            await category_move(ids.oneID, ids.twoID)
            return Promise.reject(new Error(`Expected rejection with '${failureMessage}'`))
          } catch(err) {
            let includesCorrectError = err.message.includes(failureMessage)

            if (!includesCorrectError) {
              return Promise.reject(new Error(`Expected rejection with '${failureMessage}'. Different error found`))
            }
          }
        })
      })
    })
  })

  after(async () => {
    await Time._db('account').where('id', accountAID).del()
    await Time._db('account').where('id', accountBID).del()
    await Time._db('account').where('id', accountCID).del()
  })
})
