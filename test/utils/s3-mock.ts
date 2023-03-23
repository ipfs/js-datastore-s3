import { expect } from 'aegir/chai'
import sinon from 'sinon'
import { Buffer } from 'buffer'
import AWS from 'aws-sdk'
import type S3 from 'aws-sdk/clients/s3'

export class S3Error extends Error {
  public code: string
  public statusCode?: number

  constructor (message: string, code?: number) {
    super(message)
    this.code = message
    this.statusCode = code
  }
}

export const s3Resolve = (res?: any): AWS.Request<unknown, unknown> => {
  const request = new AWS.Request(new AWS.Service(), 'op')

  sinon.replace(request, 'promise', async () => {
    return await Promise.resolve(res)
  })

  return request
}

export const s3Reject = <T> (err: T): AWS.Request<unknown, unknown> => {
  const request = new AWS.Request(new AWS.Service(), 'op')

  sinon.replace(request, 'promise', async () => {
    return await Promise.reject(err)
  })

  return request
}

/**
 * Mocks out the s3 calls made by datastore-s3
 */
export function s3Mock (s3: S3): void {
  const mocks: any = {}
  const storage: Record<string, any> = {}

  // @ts-expect-error incorrect types
  mocks.deleteObject = sinon.replace(s3, 'deleteObject', (params) => {
    expect(params).to.have.property('Key').that.is.a('string')

    if (params == null) {
      throw new Error('No params passed to s3.deleteObject')
    }

    if (typeof params === 'function') {
      throw new Error('params passed to s3.deleteObject was a function')
    }

    if (storage[params.Key] != null) {
      delete storage[params.Key] // eslint-disable-line @typescript-eslint/no-dynamic-delete
      return s3Resolve({})
    }

    return s3Reject(new S3Error('NotFound', 404))
  })

  // @ts-expect-error incorrect types
  mocks.getObject = sinon.replace(s3, 'getObject', (params) => {
    expect(params).to.have.property('Key').that.is.a('string')

    if (params == null) {
      throw new Error('No params passed to s3.getObject')
    }

    if (typeof params === 'function') {
      throw new Error('params passed to s3.getObject was a function')
    }

    if (storage[params.Key] != null) {
      return s3Resolve({ Body: storage[params.Key] })
    }

    return s3Reject(new S3Error('NotFound', 404))
  })

  // @ts-expect-error incorrect types
  mocks.headBucket = sinon.replace(s3, 'headBucket', (params) => {
    expect(params).to.have.property('Bucket').that.is.a('string')

    if (params == null) {
      throw new Error('No params passed to s3.headBucket')
    }

    if (typeof params === 'function') {
      throw new Error('params passed to s3.headBucket was a function')
    }

    return s3Resolve()
  })

  // @ts-expect-error incorrect types
  mocks.headObject = sinon.replace(s3, 'headObject', (params) => {
    expect(params).to.have.property('Key').that.is.a('string')

    if (params == null) {
      throw new Error('No params passed to s3.headObject')
    }

    if (typeof params === 'function') {
      throw new Error('params passed to s3.headObject was a function')
    }

    if (storage[params.Key] != null) {
      return s3Resolve({})
    }
    return s3Reject(new S3Error('NotFound', 404))
  })

  // @ts-expect-error incorrect types
  mocks.listObjectV2 = sinon.replace(s3, 'listObjectsV2', (params) => {
    expect(params).to.have.property('Prefix').that.is.a('string')

    if (params == null) {
      throw new Error('No params passed to s3.listObjectsV2')
    }

    if (typeof params === 'function') {
      throw new Error('params passed to s3.listObjectsV2 was a function')
    }

    const results: { Contents: Array<{ Key: string }> } = {
      Contents: []
    }

    for (const k in storage) {
      if (k.startsWith(`${params.Prefix ?? ''}`)) {
        results.Contents.push({
          Key: k
        })
      }
    }

    return s3Resolve(results)
  })

  // @ts-expect-error incorrect types
  mocks.upload = sinon.replace(s3, 'upload', (params) => {
    expect(params.Key).to.be.a('string')
    expect(params.Body).to.be.instanceof(Buffer)
    storage[params.Key] = params.Body
    return s3Resolve({})
  })
}
