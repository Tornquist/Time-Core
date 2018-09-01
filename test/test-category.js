let chai = require('chai');
let chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
let should = chai.should();

const config = require('./setup/config')
const Time = require(process.env.PWD)(config)

describe('Category Module', () => {
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

    it('can be saved', done => {
      category.save()
      .then(() => done()).catch(done)
    })

    it('will have a unique id', done => {
      category.id.should.be.a('number')
      newID = category.id
      done()
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
      await parent.save()

      child = new Time.Category({ name: "Child" })
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
})
