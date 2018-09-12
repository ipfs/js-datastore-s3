/* @flow */
/* eslint-env mocha */
'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
const expect = chai.expect

const Key = require('interface-datastore').Key

const S3 = require('aws-sdk').S3
const S3Mock = require('./utils/s3-mock')
const standin = require('stand-in')

const S3Store = require('../src')

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
    it('should include the path in the key', (done) => {
      const s3 = new S3({ params: { Bucket: 'my-ipfs-bucket' } })
      const store = new S3Store('.ipfs/datastore', { s3 })

      standin.replace(s3, 'upload', function (stand, params, callback) {
        expect(params.Key).to.equal('.ipfs/datastore/z/key')
        stand.restore()
        callback(null)
      })

      store.put(new Key('/z/key'), Buffer.from('test data'), done)
    })
    it('should create the bucket when missing if createIfMissing is true', (done) => {
      const s3 = new S3({ params: { Bucket: 'my-ipfs-bucket' } })
      const store = new S3Store('.ipfs/datastore', { s3, createIfMissing: true })

      // 1. On the first call upload will fail with a NoSuchBucket error
      // 2. This should result in the `createBucket` standin being called
      // 3. upload is then called a second time and it passes

      let bucketCreated = false
      standin.replace(s3, 'upload', (stand, params, callback) => {
        if (!bucketCreated) {
          const err = { code: 'NoSuchBucket' }
          return callback(err)
        }
        stand.restore()
        return callback(null)
      })

      standin.replace(s3, 'createBucket', (stand, params, callback) => {
        bucketCreated = true
        stand.restore()
        return callback()
      })

      store.put(new Key('/z/key'), Buffer.from('test data'), done)
    })
    it('should not create the bucket when missing if createIfMissing is false', (done) => {
      const s3 = new S3({ params: { Bucket: 'my-ipfs-bucket' } })
      const store = new S3Store('.ipfs/datastore', { s3, createIfMissing: false })

      let bucketCreated = false
      standin.replace(s3, 'upload', (stand, params, callback) => {
        if (!bucketCreated) {
          const err = { code: 'NoSuchBucket' }
          return callback(err)
        }
        stand.restore()
        return callback(null)
      })

      standin.replace(s3, 'createBucket', (stand, params, callback) => {
        bucketCreated = true
        stand.restore()
        return callback()
      })

      store.put(new Key('/z/key'), Buffer.from('test data'), (err) => {
        expect(bucketCreated).to.equal(false)
        expect(err).to.have.property('code', 'ERR_DB_WRITE_FAILED')
        done()
      })
    })
  })

  describe('get', () => {
    it('should include the path in the fetch key', (done) => {
      const s3 = new S3({ params: { Bucket: 'my-ipfs-bucket' } })
      const store = new S3Store('.ipfs/datastore', { s3 })

      standin.replace(s3, 'getObject', function (stand, params, callback) {
        expect(params.Key).to.equal('.ipfs/datastore/z/key')
        stand.restore()
        callback(null, { Body: Buffer.from('test') })
      })

      store.get(new Key('/z/key'), done)
    })
  })

  describe('interface-datastore', () => {
    require('interface-datastore/src/tests')({
      setup (callback) {
        let s3 = new S3({
          params: { Bucket: 'my-ipfs-bucket' }
        })
        S3Mock(s3)
        callback(null, new S3Store('.ipfs/datastore', { s3 }))
      },
      teardown (callback) {
        callback(null)
      }
    })
  })
})
