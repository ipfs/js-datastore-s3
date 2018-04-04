'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
const expect = chai.expect
const standin = require('stand-in')

/**
 * Mocks out the s3 calls made by datastore-s3
 */
module.exports = class S3Mock {
  constructor(s3) {
    this.s3 = s3
    this.mocks = {}
    this.storage = {}
    this.mock(s3)
  }

  mock(s3) {
    this.mocks['deleteObject'] = standin.replace(s3, 'deleteObject', (stand, params, callback) => {
      expect(params.Key).to.be.a('string')
      if (this.storage[params.Key]) {
        delete this.storage[params.Key] 
        callback(null, {})  
      } else {
        callback({ code: 'NotFound' }, null)  
      }      
    })

    this.mocks['getObject'] = standin.replace(s3, 'getObject', (stand, params, callback) => {
      expect(params.Key).to.be.a('string')
      if (this.storage[params.Key]) {
        callback(null, { Body: this.storage[params.Key] })  
      } else {
        callback({ code: 'NotFound' }, null)  
      }      
    })

    this.mocks['headBucket'] = standin.replace(s3, 'headBucket', (stand, params, callback) => {
      expect(params.Bucket).to.be.a('string')
      callback(null)
    })

    this.mocks['headObject'] = standin.replace(s3, 'headObject', (stand, params, callback) => {
      expect(params.Key).to.be.a('string')
      if (this.storage[params.Key]) {
        callback(null, {})  
      } else {
        callback({ code: 'NotFound' }, null)  
      }      
    })

    this.mocks['listObjectsV2'] = standin.replace(s3, 'listObjectsV2', (stand, params, callback) => {
      expect(params.Prefix).to.be.a('string')
      const results = {
        Contents: []
      }

      for (let k in this.storage) {
        if (k.startsWith(params.Prefix)) {
          results.Contents.push({
            Key: k
          })
        }
      }
      
      callback(null, results)
    })
    
    this.mocks['upload'] = standin.replace(s3, 'upload', (stand, params, callback) => {
      expect(params.Key).to.be.a('string')
      expect(params.Body).to.be.instanceof(Buffer)
      this.storage[params.Key] = params.Body
      callback(null)
    })    
  }
}