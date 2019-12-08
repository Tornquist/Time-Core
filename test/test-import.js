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
  let user = null;

  before(async () => {
    UserHelper.link(Time)
    user = await UserHelper.create()
    user = user.user
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
      return Time.Import.loadInto(user, {
        name: 'Missing keys'
      })
      .should.be.rejectedWith(Time.Error.Data.INCORRECT_FORMAT)
    })

    it('validates names: only top level can be empty', async () => {
      // Accept empty top
      await Time.Import.loadInto(user, {
        name: '',
        events: [],
        ranges: [],
        children: []
      }).should.be.fulfilled

      // Reject empty child
      await Time.Import.loadInto(user, {
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
      await Time.Import.loadInto(user, {
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
      await Time.Import.loadInto(user, {
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
      await Time.Import.loadInto(user, {
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
      await Time.Import.loadInto(user, {
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
      let importReference = await Time.Import.loadInto(user, {
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
      importReference.userID.should.eq(user.id)
      importReference.createdAt.should.be.a('date')
      importReference.updatedAt.should.be.a('date')
      importReference.expectedCategories.should.eq(1)
      importReference.importedCategories.should.eq(0)
      importReference.expectedEntries.should.eq(2)
      importReference.importedEntries.should.eq(0)
      importReference.complete.should.eq(false)
      importReference.success.should.eq(false)
    })

    describe('Loading large files', () => {
      let importer;

      it('Allows an import to be initiated', async () => {
        importer = await Time.Import.loadInto(user, testData)

        importer.constructor.name.should.eq('Import')
        importer.userID.should.eq(user.id)
        importer.createdAt.should.be.a('date')
        importer.updatedAt.should.be.a('date')
        importer.expectedCategories.should.eq(9)
        importer.importedCategories.should.eq(0)
        importer.expectedEntries.should.eq(138)
        importer.importedEntries.should.eq(0)
        importer.complete.should.eq(false)
        importer.success.should.eq(false)
      })

      it('Updates progress as it executes',  async () => {
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
          await sleep(25)

          importer.importedEntries.should.be.greaterThan(lastImportedEntries)
          importer.importedCategories.should.be.greaterThan(lastImportedCategories)
        }
      })

      it('Marks complete when finished', async () => {
        while (importer.complete !== true) {
          await sleep(10)
        }

        importer.constructor.name.should.eq('Import')
        importer.userID.should.eq(user.id)
        importer.createdAt.should.be.a('date')
        importer.updatedAt.should.be.a('date')
        importer.expectedCategories.should.eq(9)
        importer.importedCategories.should.eq(9)
        importer.expectedEntries.should.eq(138)
        importer.importedEntries.should.eq(138)
        importer.complete.should.eq(true)
        importer.success.should.eq(true)
      })

      it('Can be fetched and validated', async () => {
        let fetchedImporter = await Time.Import.fetch(importer.id)

        fetchedImporter.constructor.name.should.eq('Import')
        fetchedImporter.userID.should.eq(user.id)
        fetchedImporter.createdAt.should.be.a('date')
        fetchedImporter.updatedAt.should.be.a('date')
        fetchedImporter.expectedCategories.should.eq(9)
        fetchedImporter.importedCategories.should.eq(9)
        fetchedImporter.expectedEntries.should.eq(138)
        fetchedImporter.importedEntries.should.eq(138)
        fetchedImporter.complete.should.eq(true)
        fetchedImporter.success.should.eq(true)
      })
    })
  })
})
