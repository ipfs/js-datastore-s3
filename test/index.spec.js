/* eslint-env mocha */
'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
const expect = chai.expect

const { Buffer } = require('buffer')
const standin = require('stand-in')
const Key = require('interface-datastore').Key
const S3 = require('aws-sdk').S3

const S3Mock = require('./utils/s3-mock')
const { s3Resolve, s3Reject, S3Error } = S3Mock
const S3Store = require('../src')
const { createRepo } = require('../src')

describe('S3Datastore', () => {
  describe('construction', () => {
    it('requires a bucket', () => {
      const s3 = new S3({ params: { Bucket: null } })
      expect(
        () => new S3Store('.ipfs/datastore', { s3 })
      ).to.throw()
    })
    it('createIfMissing defaults to false', () => {
      const s3 = new S3({ params: { Bucket: 'test' } })
      const store = new S3Store('.ipfs', { s3 })
      expect(store.createIfMissing).to.equal(false)
    })
    it('createIfMissing can be set to true', () => {
      const s3 = new S3({ params: { Bucket: 'test' } })
      const store = new S3Store('.ipfs', { s3, createIfMissing: true })
      expect(store.createIfMissing).to.equal(true)
    })
  })

  describe('put', () => {
    it('should include the path in the key', () => {
      const s3 = new S3({ params: { Bucket: 'my-ipfs-bucket' } })
      const store = new S3Store('.ipfs/datastore', { s3 })

      standin.replace(s3, 'upload', function (stand, params) {
        expect(params.Key).to.equal('.ipfs/datastore/z/key')
        stand.restore()
        return s3Resolve(null)
      })

      return store.put(new Key('/z/key'), Buffer.from('test data'))
    })

    it('should turn Uint8Arrays into Buffers', () => {
      const s3 = new S3({ params: { Bucket: 'my-ipfs-bucket' } })
      const store = new S3Store('.ipfs/datastore', { s3 })

      standin.replace(s3, 'upload', function (stand, params) {
        expect(Buffer.isBuffer(params.Body)).to.be.true()
        stand.restore()
        return s3Resolve(null)
      })

      return store.put(new Key('/z/key'), new TextEncoder().encode('test data'))
    })

    it('should create the bucket when missing if createIfMissing is true', () => {
      const s3 = new S3({ params: { Bucket: 'my-ipfs-bucket' } })
      const store = new S3Store('.ipfs/datastore', { s3, createIfMissing: true })

      // 1. On the first call upload will fail with a NoSuchBucket error
      // 2. This should result in the `createBucket` standin being called
      // 3. upload is then called a second time and it passes

      let bucketCreated = false
      standin.replace(s3, 'upload', (stand, params) => {
        if (!bucketCreated) {
          return s3Reject(new S3Error('NoSuchBucket'))
        }
        stand.restore()
        return s3Resolve(null)
      })

      standin.replace(s3, 'createBucket', (stand, params) => {
        bucketCreated = true
        stand.restore()
        return s3Resolve()
      })

      return store.put(new Key('/z/key'), Buffer.from('test data'))
    })

    it('should not create the bucket when missing if createIfMissing is false', async () => {
      const s3 = new S3({ params: { Bucket: 'my-ipfs-bucket' } })
      const store = new S3Store('.ipfs/datastore', { s3, createIfMissing: false })

      let bucketCreated = false
      standin.replace(s3, 'upload', (stand, params) => {
        if (!bucketCreated) {
          return s3Reject(new S3Error('NoSuchBucket'))
        }
        stand.restore()
        return s3Resolve(null)
      })

      standin.replace(s3, 'createBucket', (stand, params) => {
        bucketCreated = true
        stand.restore()
        return s3Resolve()
      })

      try {
        await store.put(new Key('/z/key'), Buffer.from('test data'))
      } catch (err) {
        expect(bucketCreated).to.equal(false)
        expect(err).to.have.property('code', 'ERR_DB_WRITE_FAILED')
      }
    })

    it('should return a standard error when the put fails', async () => {
      const s3 = new S3({ params: { Bucket: 'my-ipfs-bucket' } })
      const store = new S3Store('.ipfs/datastore', { s3 })

      standin.replace(s3, 'upload', function (stand, params) {
        expect(params.Key).to.equal('.ipfs/datastore/z/key')
        stand.restore()
        return s3Reject(new Error('bad things happened'))
      })

      try {
        await store.put(new Key('/z/key'), Buffer.from('test data'))
      } catch (err) {
        expect(err.code).to.equal('ERR_DB_WRITE_FAILED')
      }
    })
  })

  describe('get', () => {
    it('should include the path in the fetch key', () => {
      const s3 = new S3({ params: { Bucket: 'my-ipfs-bucket' } })
      const store = new S3Store('.ipfs/datastore', { s3 })

      standin.replace(s3, 'getObject', function (stand, params) {
        expect(params.Key).to.equal('.ipfs/datastore/z/key')
        stand.restore()
        return s3Resolve({ Body: Buffer.from('test') })
      })

      return store.get(new Key('/z/key'))
    })

    it('should return a standard not found error code if the key isnt found', async () => {
      const s3 = new S3({ params: { Bucket: 'my-ipfs-bucket' } })
      const store = new S3Store('.ipfs/datastore', { s3 })

      standin.replace(s3, 'getObject', function (stand, params) {
        expect(params.Key).to.equal('.ipfs/datastore/z/key')
        stand.restore()
        return s3Reject(new S3Error('NotFound', 404))
      })

      try {
        await store.get(new Key('/z/key'))
      } catch (err) {
        expect(err.code).to.equal('ERR_NOT_FOUND')
      }
    })
  })

  describe('delete', () => {
    it('should return a standard delete error if deletion fails', async () => {
      const s3 = new S3({ params: { Bucket: 'my-ipfs-bucket' } })
      const store = new S3Store('.ipfs/datastore', { s3 })

      standin.replace(s3, 'deleteObject', function (stand, params) {
        expect(params.Key).to.equal('.ipfs/datastore/z/key')
        stand.restore()
        return s3Reject(new Error('bad things'))
      })

      try {
        await store.delete(new Key('/z/key'))
      } catch (err) {
        expect(err.code).to.equal('ERR_DB_DELETE_FAILED')
      }
    })
  })

  describe('open', () => {
    it('should return a standard open error if the head request fails with an unknown error', async () => {
      const s3 = new S3({ params: { Bucket: 'my-ipfs-bucket' } })
      const store = new S3Store('.ipfs/datastore', { s3 })

      standin.replace(s3, 'headObject', function (stand, _) {
        stand.restore()
        return s3Reject(new Error('unknown'))
      })

      try {
        await store.open()
      } catch (err) {
        expect(err.code).to.equal('ERR_DB_OPEN_FAILED')
      }
    })
  })

  describe('createRepo', () => {
    it('should be able to create a repo', () => {
      const path = '.ipfs'
      const repo = createRepo({
        path
      }, {
        bucket: 'my-ipfs-bucket'
      })

      expect(repo).to.exist()
      expect(repo.path).to.eql(path)
    })
  })

  describe('interface-datastore', () => {
    require('interface-datastore/src/tests')({
      setup () {
        const s3 = new S3({
          params: { Bucket: 'my-ipfs-bucket' }
        })
        S3Mock(s3)
        return new S3Store('.ipfs/datastore', { s3 })
      },
      teardown () {
      }
    })
  })
})
