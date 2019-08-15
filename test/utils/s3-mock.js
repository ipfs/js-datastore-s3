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

const s3Resolve = (res) => ({ promise: () => Promise.resolve(res) })
const s3Reject = (err) => ({ promise: () => Promise.reject(err) })

/**
 * Mocks out the s3 calls made by datastore-s3
 * @param {S3Instance} s3
 * @returns {void}
 */
module.exports = function (s3) {
  const mocks = {}
  const storage = {}

  mocks.deleteObject = standin.replace(s3, 'deleteObject', (stand, params) => {
    expect(params.Key).to.be.a('string')
    if (storage[params.Key]) {
      delete storage[params.Key]
      return s3Resolve({})
    }
    return s3Reject(new S3Error('NotFound', 404))
  })

  mocks.getObject = standin.replace(s3, 'getObject', (stand, params) => {
    expect(params.Key).to.be.a('string')
    if (storage[params.Key]) {
      return s3Resolve({ Body: storage[params.Key] })
    }
    return s3Reject(new S3Error('NotFound', 404))
  })

  mocks.headBucket = standin.replace(s3, 'headBucket', (stand, params) => {
    expect(params.Bucket).to.be.a('string')
    return s3Resolve()
  })

  mocks.headObject = standin.replace(s3, 'headObject', (stand, params) => {
    expect(params.Key).to.be.a('string')
    if (storage[params.Key]) {
      return s3Resolve({})
    }
    return s3Reject(new S3Error('NotFound', 404))
  })

  mocks.listObjectV2 = standin.replace(s3, 'listObjectsV2', (stand, params) => {
    expect(params.Prefix).to.be.a('string')
    const results = {
      Contents: []
    }

    for (const k in storage) {
      if (k.startsWith(params.Prefix)) {
        results.Contents.push({
          Key: k
        })
      }
    }

    return s3Resolve(results)
  })

  mocks.upload = standin.replace(s3, 'upload', (stand, params) => {
    expect(params.Key).to.be.a('string')
    expect(params.Body).to.be.instanceof(Buffer)
    storage[params.Key] = params.Body
    return s3Resolve({})
  })
}

module.exports.S3Error = S3Error
module.exports.s3Resolve = s3Resolve
module.exports.s3Reject = s3Reject
