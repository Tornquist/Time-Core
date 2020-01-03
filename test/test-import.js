let chai = require('chai');
let chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
let should = chai.should();

const UserHelper = require('./helpers/user')
const joi = require('@hapi/joi')

const config = require('./setup/config')
const Time = require(process.env.PWD)(config)

const testData = require('./data/import')
const sleep = (ms) => (new Promise(resolve => setTimeout(resolve, ms)))

describe('Import Module', () => {
  let user1 = null;
  let user2 = null;
  let largeImporterID = null;

  before(async () => {
    UserHelper.link(Time)
    let user1Data = await UserHelper.create()
    user1 = user1Data.user

    let user2Data = await UserHelper.create()
    user2 = user2Data.user
  })

  describe('Request formatting', () => {
    it ('provides an interface to the request schema', () => {
      let schema = Time.Import.getRequestSchema()
      should.equal(joi.isSchema(schema), true)
    })

    it('requires all keys: even if empty objects', () => {
      let schema = Time.Import.getRequestSchema()
      
      let nameRequest = {
        name: 'Top'
      }

      let validatedNameRequest = schema.validate(nameRequest)
      let validatedNameRequestError = (validatedNameRequest.error || {}).message
      should.equal(validatedNameRequestError, '"events" is required')

      let eventsRequest = {
        name: 'Top',
        events: []
      }

      let validatedEventsRequest = schema.validate(eventsRequest)
      let validatedEventsRequestError = (validatedEventsRequest.error || {}).message
      should.equal(validatedEventsRequestError, '"ranges" is required')

      let rangesRequest = {
        name: 'Top',
        events: [],
        ranges: []
      }

      let validatedRangesRequest = schema.validate(rangesRequest)
      let validatedRangesRequestError = (validatedRangesRequest.error || {}).message
      should.equal(validatedRangesRequestError, '"children" is required')

      let childrenRequest = {
        name: 'Top',
        events: [],
        ranges: [],
        children: []
      }

      let validatedChildrenRequest = schema.validate(childrenRequest)
      should.equal(validatedChildrenRequest.error, undefined)
    })

    it('accepts objects with complete events', () => {
      let schema = Time.Import.getRequestSchema()
      
      let request = {
        name: 'Top',
        events: [{
          started_at: "2016-08-07T20:30:00.000Z",
          started_at_timezone: "America/Chicago"
        }],
        ranges: [{
          started_at: "2016-08-19T01:32:00.000Z",
          started_at_timezone: "America/Chicago",
          ended_at: "2016-08-19T01:46:00.000Z",
          ended_at_timezone: "America/Chicago"
        }],
        children: []
      }

      let validatedRequest = schema.validate(request)
      should.equal(validatedRequest.error, undefined)
    })
  })

  describe('Loading Data', () => {
    it('rejects invalid formatting', () => {
      return Time.Import.loadInto(user1, {
        name: 'Missing keys'
      })
      .should.be.rejectedWith(Time.Error.Data.INCORRECT_FORMAT)
    })

    it('validates names: only top level can be empty', async () => {
      // Accept empty top
      await Time.Import.loadInto(user1, {
        name: '',
        events: [],
        ranges: [],
        children: []
      }).should.be.fulfilled

      // Reject empty child
      await Time.Import.loadInto(user1, {
        name: '',
        events: [],
        ranges: [],
        children: [{
          name: '',
          events: [],
          ranges: [],
          children: []
        }]
      }).should.be.rejectedWith(Time.Error.Data.INCORRECT_FORMAT)

      // Accept set child
      await Time.Import.loadInto(user1, {
        name: '',
        events: [],
        ranges: [],
        children: [{
          name: 'Child name',
          events: [],
          ranges: [],
          children: []
        }]
      }).should.be.fulfilled

      // Accept set root and child
      await Time.Import.loadInto(user1, {
        name: 'Parent name',
        events: [],
        ranges: [],
        children: [{
          name: 'Child name',
          events: [],
          ranges: [],
          children: []
        }]
      }).should.be.fulfilled

      // Accept empty root and set children
      await Time.Import.loadInto(user1, {
        name: '',
        events: [],
        ranges: [],
        children: [
          {
            name: 'First child',
            events: [],
            ranges: [],
            children: []
          },
          {
            name: 'Second child',
            events: [],
            ranges: [],
            children: [{
              name: 'Grandchild name',
              events: [],
              ranges: [],
              children: []
            }]
          }
        ]
      }).should.be.fulfilled

      // Reject empty inner child
      await Time.Import.loadInto(user1, {
        name: '',
        events: [],
        ranges: [],
        children: [{
          name: 'Child name',
          events: [],
          ranges: [],
          children: [{
            name: '',
            events: [],
            ranges: [],
            children: []
          }]
        }]
      }).should.be.rejectedWith(Time.Error.Data.INCORRECT_FORMAT)
    })

    it('returns a import object', async () => {
      let importReference = await Time.Import.loadInto(user1, {
        name: '',
        events: [],
        ranges: [],
        children: [{
          name: 'Fun stuff',
          events: [{
            started_at: "2016-08-07T20:30:00.000Z",
            started_at_timezone: "America/Chicago"
          }],
          ranges: [{
            started_at: "2016-08-19T01:32:00.000Z",
            started_at_timezone: "America/Chicago",
            ended_at: "2016-08-19T01:46:00.000Z",
            ended_at_timezone: "America/Chicago"
          }],
          children: []
        }]
      })

      importReference.constructor.name.should.eq('Import')
      importReference.userID.should.eq(user1.id)
      importReference.createdAt.should.be.a('date')
      importReference.updatedAt.should.be.a('date')
      importReference.expectedCategories.should.eq(1)
      importReference.importedCategories.should.eq(0)
      importReference.expectedEntries.should.eq(2)
      importReference.importedEntries.should.eq(0)
      importReference.complete.should.eq(false)
      importReference.success.should.eq(false)
    })
  })

  describe('Loading large files', () => {
    let importer;

    it('allows an import to be initiated', async () => {
      importer = await Time.Import.loadInto(user2, testData)
      largeImporterID = importer.id

      importer.constructor.name.should.eq('Import')
      importer.userID.should.eq(user2.id)
      importer.createdAt.should.be.a('date')
      importer.updatedAt.should.be.a('date')
      importer.expectedCategories.should.eq(9)
      importer.importedCategories.should.eq(0)
      importer.expectedEntries.should.eq(138)
      importer.importedEntries.should.eq(0)
      importer.complete.should.eq(false)
      importer.success.should.eq(false)
    })

    it('does not register an account on the target user', async () => {
      let accounts = await Time.Account.findForUser(user2)
      accounts.length.should.eq(0)
    })

    it('updates progress as it executes',  async () => {
      let lastImportedEntries = importer.importedEntries
      let lastImportedCategories = importer.importedCategories

      let waitForCategoryComplete = true
      while (waitForCategoryComplete) {
        await sleep(10)
        if (importer.importedCategories === importer.expectedCategories) {
          waitForCategoryComplete = false
        }
      }

      for (let i = 0; i < 3; i++) {
        await sleep(30)

        importer.importedEntries.should.be.greaterThan(lastImportedEntries)
        importer.importedCategories.should.be.greaterThan(lastImportedCategories)
      }
    })

    it('marks complete when finished', async () => {
      while (importer.complete !== true) {
        await sleep(10)
      }

      importer.constructor.name.should.eq('Import')
      importer.userID.should.eq(user2.id)
      importer.createdAt.should.be.a('date')
      importer.updatedAt.should.be.a('date')
      importer.expectedCategories.should.eq(9)
      importer.importedCategories.should.eq(9)
      importer.expectedEntries.should.eq(138)
      importer.importedEntries.should.eq(138)
      importer.complete.should.eq(true)
      importer.success.should.eq(true)
    })

    it('links the account to the user on complete', async () => {
      let accounts = await Time.Account.findForUser(user2)
      accounts.length.should.eq(1)
    })

    it('imports the expected data', async () => {
      let accounts = await Time.Account.findForUser(user2)
      accounts.length.should.eq(1)
      let account = accounts[0]

      let categories = await Time.Category.findForAccount(account)
      categories.length.should.eq(9 + 1) // Imported + Root
      
      let root = categories.find(c => c.name === 'root')
      let children = await root.getChildren()
      let childrenNames = Array.from(new Set(children.map(c => c.name)))
      let expectedNames = Array.from(new Set(['Life', 'Work', 'Side Projects']))
      childrenNames.length.should.eq(expectedNames.length)
      for (let name of childrenNames) {
        expectedNames.should.include(name)
      }

      let entries = await Time.Entry.findFor({ accounts: [account] })
      entries.length.should.eq(138)
    })
  })

  describe('Fetching import records', () => {
    it('can be loaded directly', async () => {
      let fetchedImporter = await Time.Import.fetch(largeImporterID)

      fetchedImporter.constructor.name.should.eq('Import')
      fetchedImporter.userID.should.eq(user2.id)
      fetchedImporter.createdAt.should.be.a('date')
      fetchedImporter.updatedAt.should.be.a('date')
      fetchedImporter.expectedCategories.should.eq(9)
      fetchedImporter.importedCategories.should.eq(9)
      fetchedImporter.expectedEntries.should.eq(138)
      fetchedImporter.importedEntries.should.eq(138)
      fetchedImporter.complete.should.eq(true)
      fetchedImporter.success.should.eq(true)
    })

    it('only allows save to be called once', async () => {
      let fetchedImporter = await Time.Import.fetch(largeImporterID)
      try {
        await fetchedImporter.save()
      } catch (err) {
        err.should.eq(Time.Error.Request.INVALID_ACTION)
        return
      }
      throw new Error('Should have thrown Time.Error.Request.INVALID_ACTION')
    })

    it('throws when loading invalid IDs', () => {
      return Time.Import.fetch(10000)
        .should.be.rejectedWith(Time.Error.Data.NOT_FOUND)
    })

    it('allows all records to be loaded for a given user', async () => {
      let user1Records = await Time.Import.findForUser(user1)
      let user2Records = await Time.Import.findForUser(user2)

      user1Records.length.should.be.greaterThan(1)
      user2Records.length.should.be.eq(1)
    })
  })

  describe('Importing data with set and null roots', () => {
    it('attaches a set root node directly to the account root', async () => {
      let user = await UserHelper.create()
      user = user.user

      await Time.Import.loadInto(user, {
        name: 'Set Root',
        events: [],
        ranges: [],
        children: [{
          name: 'First Child',
          events: [],
          ranges: [],
          children: []
        }]
      })

      await sleep(100)

      let accounts = await Time.Account.findForUser(user)
      accounts.length.should.eq(1)
      let account = accounts[0]

      let categories = await Time.Category.findForAccount(account)
      categories.length.should.eq(2 + 1) // Imported + Root
      let root = categories.find(c => c.name === 'root')
      let children = await root.getChildren()
      let childrenNames = children.map(c => c.name)

      childrenNames.length.should.eq(1)
      childrenNames[0].should.eq('Set Root')
    })

    it('attaches the children of the null root directly to the account root', async () => {
      let user = await UserHelper.create()
      user = user.user

      await Time.Import.loadInto(user, {
        name: '', // Null Root
        events: [],
        ranges: [],
        children: [{
          name: 'First Child',
          events: [],
          ranges: [],
          children: []
        }, {
          name: 'Second Child',
          events: [],
          ranges: [],
          children: []
        }, {
          name: 'Third Child',
          events: [],
          ranges: [],
          children: []
        }]
      })

      await sleep(100)

      let accounts = await Time.Account.findForUser(user)
      accounts.length.should.eq(1)
      let account = accounts[0]

      let categories = await Time.Category.findForAccount(account)
      categories.length.should.eq(3 + 1) // Imported + Root
      let root = categories.find(c => c.name === 'root')
      let children = await root.getChildren()
      let childrenNames = children.map(c => c.name)

      childrenNames.length.should.eq(3)
      childrenNames.should.include('First Child')
      childrenNames.should.include('Second Child')
      childrenNames.should.include('Third Child')
    })
  })
})
