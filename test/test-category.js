let chai = require('chai');
let chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
let should = chai.should();

const config = require('./setup/config')
const Time = require(process.env.PWD)(config)

const AccountHelper = require('./helpers/account')

describe('Category Module', () => {
  let accountTree;
  let secondAccountTree;

  before(async () => {
    AccountHelper.link(Time)

    accountTree = await AccountHelper.createTree()
    secondAccountTree = await AccountHelper.createTree()
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
      return category.save()
      .should.be.rejectedWith(Time.Error.Category.INSUFFICIENT_PARENT_OR_ACCOUNT)
    })

    it('allows account to be set', done => {
      category.account = accountTree.account
      done()
    })

    it('can be saved', done => {
      category.save()
      .then(() => done()).catch(done)
    })

    it('can be saved again without issue', () => {
      // Will short circuit and skip db
      return category.save()
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

      category.parent_id.should.eq(accountRootNode)
    })

    it('can be created with parent and no account', async () => {
      let newCategory = new Time.Category()
      newCategory.name = 'No Account'
      newCategory.parent = category

      await newCategory.save()

      newCategory.account_id.should.eq(category.account_id)
    })

    it('will be rejected if category and parent are mismatched', () => {
      let newCategory = new Time.Category()
      newCategory.name = 'Will throw'
      newCategory.parent = category
      newCategory.account = 100000

      return newCategory.save()
      .should.be.rejectedWith(Time.Error.Category.INCONSISTENT_PARENT_AND_ACCOUNT)
    })

    it('will be rejected with an invalid account', () => {
      let newCategory = new Time.Category()
      newCategory.name = 'Will throw'
      newCategory.account = 100000

      return newCategory.save()
      .should.be.rejectedWith(Time.Error.Data.NOT_FOUND)
    })

    it('will be rejected with an invalid parent', () => {
      let newCategory = new Time.Category()
      newCategory.name = 'Will throw'

      newCategory.parent_id = 10000

      return newCategory.save()
      .should.be.rejectedWith(Time.Error.Data.NOT_FOUND)
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

    describe('By account', () => {
      let category;

      before(async () => {
        category = await Time.Category.fetch(newID)
      })

      it('allows allows all categories to be loaded with an id', async () => {
        let categories = await Time.Category.findForAccount(category.account_id)

        categories.length.should.eq(3)
      })

      it('allows allows all categories to be loaded with an object', async () => {
        let categories = await Time.Category.findForAccount(accountTree.account)

        categories.length.should.eq(3)
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
      child.parent_id.should.eq(parent.id)
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

    it("denies removing parent", done => {
      try {
        child.parent = null
        done(new Error('Expected rejection of null parent'))
      } catch (err) {
        err.should.be.eq(Time.Error.Request.INVALID_TYPE)
        done()
      }
    })
  })

  describe('Moving categories', () => {
    let categoryA;
    let categoryB;
    let categoryC;
    let categoryD;
    before(async () => {
      categoryA = new Time.Category({
        name: "A",
        account_id: accountTree.account.id
      })
      await categoryA.save()
      categoryB = new Time.Category({
        name: "B",
        account_id: accountTree.account.id
      })
      await categoryB.save()
      categoryC = new Time.Category({
        name: "C",
        account_id: secondAccountTree.account.id
      })
      await categoryC.save()
      categoryD = new Time.Category({
        name: "D",
        account_id: secondAccountTree.account.id
      })
      await categoryD.save()
    })

    it('Allows moving within an account by parent alone', async () => {
      categoryA.parent = categoryB
      await categoryA.save()

      let fresh = await Time.Category.fetch(categoryA.id)
      categoryA.parent_id.should.eq(categoryB.id)
    })

    it('Allows moving between accounts with account alone', async () => {
      categoryC.account = categoryA.account_id
      await categoryC.save()

      let fresh = await Time.Category.fetch(categoryC.id)
      categoryC.account_id.should.eq(categoryA.account_id)
    })

    it('Allows moving between accounts with parent alone', async () => {
      categoryB.parent = categoryD
      await categoryB.save()

      let freshB = await Time.Category.fetch(categoryB.id)
      let freshA = await Time.Category.fetch(categoryA.id)

      // B points to second account root (same as D)
      // Original object will be updated as well
      categoryB.parent_id.should.eq(categoryD.id)
      categoryB.account_id.should.eq(categoryD.account_id)

      freshB.parent_id.should.eq(categoryD.id)
      freshB.account_id.should.eq(categoryD.account_id)

      // Children come with. Fresh objects have correct values
      freshA.parent_id.should.eq(categoryB.id)
      freshA.account_id.should.eq(categoryD.account_id)

      // Old objects will be out of date
      categoryA.parent_id.should.eq(categoryB.id)
      categoryA.account_id.should.not.eq(categoryD.account_id)

      // Update records for other tests
      categoryA = freshA
      categoryB = freshB
    })

    it('Allows moving between accounts with parent and account when they match', async () => {
      categoryC.parent = categoryD
      categoryC.account = categoryB.account_id
      await categoryC.save()

      let fresh = await Time.Category.fetch(categoryC.id)

      categoryC.parent_id.should.eq(categoryD.id)
      fresh.parent_id.should.eq(categoryD.id)

      categoryC.account_id.should.eq(categoryD.account_id)
      fresh.account_id.should.eq(categoryD.account_id)
    })

    it('Denies moving between accounts with parent and account when they are inconsistent', () => {
      categoryC.parent = categoryB
      categoryC.account = accountTree
      return categoryC.save()
      .should.be.rejectedWith(Time.Error.Category.INCONSISTENT_PARENT_AND_ACCOUNT)
    })
  })

  describe('Deleting categories', () => {
    let categoryA;
    let categoryB;
    let categoryC;
    let categoryD;
    let categoryE;

    before(async () => {
      //  A
      //  -- E
      //  B
      //  -- C
      //  -- D

      categoryA = new Time.Category({
        name: "A",
        account_id: accountTree.account.id
      })
      await categoryA.save()

      categoryB = new Time.Category({
        name: "B",
        account_id: accountTree.account.id
      })
      await categoryB.save()

      categoryC = new Time.Category({
        name: "C",
        parent_id: categoryB.id
      })
      await categoryC.save()

      categoryD = new Time.Category({
        name: "D",
        parent_id: categoryB.id
      })
      await categoryD.save()

      categoryE = new Time.Category({
        name: "E",
        parent_id: categoryA.id
      })
      await categoryE.save()
    })

    it('allows children to be deleted', async () => {
      await categoryA.delete(true)

      await Time.Category.fetch(categoryA.id)
        .should.be.rejectedWith(Time.Error.Data.NOT_FOUND)
      await Time.Category.fetch(categoryE.id)
        .should.be.rejectedWith(Time.Error.Data.NOT_FOUND)
    })

    it('allows children to be moved up to the parent\'s level', async () => {
      let parentID = categoryB.parent_id

      await categoryB.delete(false)

      await Time.Category.fetch(categoryB.id)
        .should.be.rejectedWith(Time.Error.Data.NOT_FOUND)

      let freshC = await Time.Category.fetch(categoryC.id)
      let freshD = await Time.Category.fetch(categoryD.id)

      freshC.parent_id.should.eq(parentID)
      freshD.parent_id.should.eq(parentID)
    })

    it('allows leaf nodes to be deleted', async () => {
      await categoryC.delete()
      await Time.Category.fetch(categoryC.id)
        .should.be.rejectedWith(Time.Error.Data.NOT_FOUND)
    })
  })

  after(async () => {
    await AccountHelper.cleanupTree(accountTree)
    await AccountHelper.cleanupTree(secondAccountTree)
  })
})
