'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
const expect = chai.expect
const standin = require('stand-in')

class S3Error extends Error {
  constructor (message, code) {
    super(message)
    this.code = message
    this.statusCode = code
  }
}

/**
 * Mocks out the s3 calls made by datastore-s3
 * @param {S3Instance} s3
 * @returns {void}
 */
module.exports = function (s3) {
  const mocks = {}
  const storage = {}

  mocks.deleteObject = standin.replace(s3, 'deleteObject', (stand, params, callback) => {
    expect(params.Key).to.be.a('string')
    if (storage[params.Key]) {
      delete storage[params.Key]
      callback(null, {})
    } else {
      callback(new S3Error('NotFound', 404), null)
    }
  })

  mocks.getObject = standin.replace(s3, 'getObject', (stand, params, callback) => {
    expect(params.Key).to.be.a('string')
    if (storage[params.Key]) {
      callback(null, { Body: storage[params.Key] })
    } else {
      callback(new S3Error('NotFound', 404), null)
    }
  })

  mocks.headBucket = standin.replace(s3, 'headBucket', (stand, params, callback) => {
    expect(params.Bucket).to.be.a('string')
    callback(null)
  })

  mocks.headObject = standin.replace(s3, 'headObject', (stand, params, callback) => {
    expect(params.Key).to.be.a('string')
    if (storage[params.Key]) {
      callback(null, {})
    } else {
      callback(new S3Error('NotFound', 404), null)
    }
  })

  mocks.listObjectV2 = standin.replace(s3, 'listObjectsV2', (stand, params, callback) => {
    expect(params.Prefix).to.be.a('string')
    const results = {
      Contents: []
    }

    for (let k in storage) {
      if (k.startsWith(params.Prefix)) {
        results.Contents.push({
          Key: k
        })
      }
    }

    callback(null, results)
  })

  mocks.upload = standin.replace(s3, 'upload', (stand, params, callback) => {
    expect(params.Key).to.be.a('string')
    expect(params.Body).to.be.instanceof(Buffer)
    storage[params.Key] = params.Body
    callback(null)
  })
}
