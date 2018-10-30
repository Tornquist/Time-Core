let chai = require('chai');
let chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
let should = chai.should();

const config = require('./setup/config')
const Time = require(process.env.PWD)(config)

const AccountHelper = require('./helpers/account')

describe('Category Module', () => {
  let accountTree;

  before(async () => {
    AccountHelper.link(Time)

    accountTree = await AccountHelper.createTree()
  })

  let newID;
  let startingName = "Fun Stuff"
  let endingName = "More Fun Stuff"

  describe('Creating a new category', () => {
    let category = new Time.Category()

    it('will start with no values', done => {
      should.equal(category.id, undefined);
      should.equal(category.name, undefined);
      done()
    })

    it('allows name to be set', done => {
      category.name = startingName
      done()
    })

    it('cannot be saved without an account or parent', () => {
      return category.save().should.be.rejected
    })

    it('allows account to be set', done => {
      category.account = accountTree.account
      done()
    })

    it('can be saved', done => {
      category.save()
      .then(() => done()).catch(done)
    })

    it('will have a unique id', done => {
      category.id.should.be.a('number')
      newID = category.id
      done()
    })

    it('will be created under the account root', async () => {
      let accountRootNode = await Time._db.select('id')
      .from('category')
      .whereNull('parent_id')
      .andWhere('account_id', category.account_id)
      .then(results => (results[0] || {}).id)

      category.props.parent_id.should.eq(accountRootNode)
    })

    it('can be created with parent and no account', async () => {
      let newCategory = new Time.Category()
      newCategory.name = 'No Account'
      newCategory.parent = category

      await newCategory.save()

      newCategory.account_id.should.eq(category.account_id)
    })

    it('will be rejected if category and parent are mismatched', done => {
      let newCategory = new Time.Category()
      newCategory.name = 'Will throw'
      newCategory.parent = category
      newCategory.account = 100000

      newCategory.save()
      .then(success => {
        done(new Error('Should have been rejected'))
      })
      .catch(err => {
        let correctError = err.message.includes('Category with requested parent_id and account_id not found')
        if (correctError) {
          done()
        } else {
          done(new Error('Incorrect error returned'))
        }
      })
    })
  })

  describe('Loading an existing category', () => {
    describe('That does not exist', () => {
      it('will throw', () => {
        return Time.Category.fetch(1000)
        .should.be.rejectedWith(Time.Error.Data.NOT_FOUND)
      })
    })

    describe('That does exist', () => {
      let category;

      before(async () => {
        category = await Time.Category.fetch(newID)
      })

      it('will load with the expected values', done => {
        category.name.should.eq(startingName)
        category.account_id.should.eq(accountTree.account.id)
        done()
      })

      it('will allow name to be updated', done => {
        category.name = endingName
        category.name.should.eq(endingName)
        category._modifiedProps.length.should.eq(1)
        done()
      })

      it('will store the name with save', done => {
        category.save()
        .then(saved => Time.Category.fetch(category.id))
        .then(freshObj => {
          category.name.should.eq(endingName)
          category._modifiedProps.length.should.eq(0)
          freshObj.name.should.eq(endingName)
          done()
        })
        .catch(done)
      })
    })
  })

  describe("Configuring sub-categories", () => {
    let parent;
    let child;
    before(async () => {
      parent = new Time.Category({ name: "Parent" })
      parent.account = accountTree.account
      await parent.save()

      child = new Time.Category({ name: "Child" })
      child.account = accountTree.account
    })

    it("rejects setting parent without another Category object", done => {
      try {
        child.parent = 15
        done(new Error("Expected rejection"))
      } catch (err) {
        err.should.eq(Time.Error.Request.INVALID_TYPE)
        done()
      }
    })

    it("rejects setting parent with an unsaved Category object", done => {
      let unsavedParent = new Time.Category({ name: "Unsaved Parent" })
      try {
        child.parent = unsavedParent
        done(new Error("Expected rejection"))
      } catch (err) {
        err.should.eq(Time.Error.Request.INVALID_TYPE)
        done()
      }
    })

    it("accepts setting parent with a saved Category object", done => {
      child.parent = parent
      done()
    })

    it("allows saving and will return the parent object", async () => {
      await child.save()
      child.props.parent_id.should.eq(parent.id)
    })

    it("allows retrieval of the parent object", async () => {
      let fetchedParent = await child.getParent()
      fetchedParent.id.should.eq(parent.id)
    })

    it("allows retrieval of attached children", async () => {
      let fetchedChildren = await parent.getChildren()
      fetchedChildren.length.should.eq(1)
      fetchedChildren[0].id.should.eq(child.id)
    })

    it("allows removing parent", async () => {
      child.parent = null
      await child.save()
      let parent = await child.getParent()
      should.equal(parent, null);

      let freshChild = await Time.Category.fetch(child.id)
      should.equal(freshChild.props.parent_id, null)
    })
  })

  after(async () => {
    await AccountHelper.cleanupTree(accountTree)
  })
})
