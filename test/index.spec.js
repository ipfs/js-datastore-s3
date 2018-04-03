/* @flow */
/* eslint-env mocha */
'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
const expect = chai.expect
const path = require('path')

const Key = require('interface-datastore').Key
const utils = require('interface-datastore').utils
const ShardingStore = require('datastore-core').ShardingDatastore
const sh = require('datastore-core').shard

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
  })

  describe('put', () => {
    it('should include the path in the key', (done) => {
      const s3 = new S3({ params: { Bucket: 'my-ipfs-bucket' } }) 
      const store = new S3Store('.ipfs/datastore', { s3 })      

      standin.replace(s3, 'upload', function(stand, params, callback) {
        expect(params.Key).to.equal('.ipfs/datastore/z/key')
        stand.restore()
        callback(null)
      })

      store.put(new Key('/z/key'), new Buffer('test data'), done)
    })
  })

  describe('get', () => {
    it('should include the path in the fetch key', (done) => {
      const s3 = new S3({ params: { Bucket: 'my-ipfs-bucket' } }) 
      const store = new S3Store('.ipfs/datastore', { s3 })      

      standin.replace(s3, 'getObject', function(stand, params, callback) {
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
        let s3Mock = new S3Mock(s3)
        callback(null, new S3Store('.ipfs/datastore', { s3 }))
      },
      teardown (callback) {
        callback(null)
      }
    })
  })
})
