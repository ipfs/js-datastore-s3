/* eslint-env mocha */

import { expect } from 'aegir/chai'
import sinon from 'sinon'
import { Key } from 'interface-datastore'
import { CreateBucketCommand, PutObjectCommand, HeadObjectCommand, S3, GetObjectCommand } from '@aws-sdk/client-s3'
import defer from 'p-defer'
import { interfaceDatastoreTests } from 'interface-datastore-tests'

import { s3Resolve, s3Reject, S3Error, s3Mock } from './utils/s3-mock.js'
import { S3Datastore } from '../src/index.js'

describe('S3Datastore', () => {
  describe('construction', () => {
    it('requires an s3', () => {
      expect(
        // @ts-expect-error missing params
        () => new S3Datastore()
      ).to.throw()
    })

    it('requires a bucket', () => {
      const s3 = new S3({ region: 'REGION' })
      expect(
        // @ts-expect-error missing params
        () => new S3Datastore(s3)
      ).to.throw()
    })

    it('createIfMissing defaults to false', () => {
      const s3 = new S3({ region: 'REGION' })
      const store = new S3Datastore(s3, 'test')
      expect(store.createIfMissing).to.equal(false)
    })

    it('createIfMissing can be set to true', () => {
      const s3 = new S3({ region: 'REGION' })
      const store = new S3Datastore(s3, 'test', { createIfMissing: true })
      expect(store.createIfMissing).to.equal(true)
    })
  })

  describe('put', () => {
    it('should include the path in the key', async () => {
      const s3 = new S3({ region: 'REGION' })
      const store = new S3Datastore(s3, 'test', {
        path: '.ipfs/datastore'
      })

      const deferred = defer<PutObjectCommand>()

      sinon.replace(s3, 'send', (command: PutObjectCommand) => {
        deferred.resolve(command)
        return s3Resolve(null)
      })

      await store.put(new Key('/z/key'), new TextEncoder().encode('test data'))

      const command = await deferred.promise
      expect(command).to.have.nested.property('input.Key', '.ipfs/datastore/z/key')
    })

    it('should return a standard error when the put fails', async () => {
      const s3 = new S3({ region: 'REGION' })
      const store = new S3Datastore(s3, 'test')

      sinon.replace(s3, 'send', (command: any) => {
        if (command.constructor.name === 'PutObjectCommand') {
          return s3Reject(new Error('bad things happened'))
        }

        return s3Reject(new S3Error('UnknownCommand'))
      })

      await expect(store.put(new Key('/z/key'), new TextEncoder().encode('test data'))).to.eventually.rejected
        .with.property('code', 'ERR_DB_WRITE_FAILED')
    })
  })

  describe('get', () => {
    it('should include the path in the fetch key', async () => {
      const s3 = new S3({ region: 'REGION' })
      const store = new S3Datastore(s3, 'test', {
        path: '.ipfs/datastore'
      })
      const buf = new TextEncoder().encode('test')

      const deferred = defer<GetObjectCommand>()

      sinon.replace(s3, 'send', (command: any) => {
        if (command.constructor.name === 'GetObjectCommand') {
          deferred.resolve(command)
          return s3Resolve({ Body: buf })
        }

        return s3Reject(new S3Error('UnknownCommand'))
      })

      const value = await store.get(new Key('/z/key'))

      expect(value).to.equalBytes(buf)

      const getObjectCommand = await deferred.promise
      expect(getObjectCommand).to.have.nested.property('input.Key', '.ipfs/datastore/z/key')
    })

    it('should return a standard not found error code if the key isn\'t found', async () => {
      const s3 = new S3({ region: 'REGION' })
      const store = new S3Datastore(s3, 'test')

      sinon.replace(s3, 'send', (command: any) => {
        if (command.constructor.name === 'GetObjectCommand') {
          return s3Reject(new S3Error('NotFound', 404))
        }

        return s3Reject(new S3Error('UnknownCommand'))
      })

      await expect(store.get(new Key('/z/key'))).to.eventually.rejected
        .with.property('code', 'ERR_NOT_FOUND')
    })
  })

  describe('delete', () => {
    it('should return a standard delete error if deletion fails', async () => {
      const s3 = new S3({ region: 'REGION' })
      const store = new S3Datastore(s3, 'test')

      sinon.replace(s3, 'send', (command: any) => {
        if (command.constructor.name === 'DeleteObjectCommand') {
          return s3Reject(new Error('bad things'))
        }

        return s3Reject(new S3Error('UnknownCommand'))
      })

      await expect(store.delete(new Key('/z/key'))).to.eventually.rejected
        .with.property('code', 'ERR_DB_DELETE_FAILED')
    })
  })

  describe('open', () => {
    it('should create the bucket when missing if createIfMissing is true', async () => {
      const s3 = new S3({ region: 'REGION' })
      const store = new S3Datastore(s3, 'test', { createIfMissing: true })

      // 1. On the first call upload will fail with a NoSuchBucket error
      // 2. This should result in the `createBucket` standin being called
      // 3. upload is then called a second time and it passes

      const bucketTested = defer<HeadObjectCommand>()
      const bucketCreated = defer<CreateBucketCommand>()

      sinon.replace(s3, 'send', (command: any) => {
        if (command.constructor.name === 'HeadObjectCommand') {
          bucketTested.resolve(command)
          return s3Reject(new S3Error('NoSuchBucket'))
        }

        if (command.constructor.name === 'CreateBucketCommand') {
          bucketCreated.resolve(command)
          return s3Resolve(null)
        }

        return s3Reject(new S3Error('UnknownCommand'))
      })

      await store.open()

      const headObjectCommand = await bucketTested.promise
      expect(headObjectCommand).to.have.nested.property('input.Bucket', 'test')

      const createBucketCommand = await bucketCreated.promise
      expect(createBucketCommand).to.have.nested.property('input.Bucket', 'test')
    })

    it('should not create the bucket when missing if createIfMissing is false', async () => {
      const s3 = new S3({ region: 'REGION' })
      const store = new S3Datastore(s3, 'test')

      const bucketTested = defer<HeadObjectCommand>()

      sinon.replace(s3, 'send', (command: any) => {
        if (command.constructor.name === 'HeadObjectCommand') {
          bucketTested.resolve(command)
          return s3Reject(new S3Error('NoSuchBucket'))
        }

        return s3Reject(new S3Error('UnknownCommand'))
      })

      await expect(store.open()).to.eventually.rejected
        .with.property('code', 'ERR_DB_OPEN_FAILED')

      const headObjectCommand = await bucketTested.promise
      expect(headObjectCommand).to.have.nested.property('input.Bucket', 'test')
    })

    it('should return a standard open error if the head request fails with an unknown error', async () => {
      const s3 = new S3({ region: 'REGION' })
      const store = new S3Datastore(s3, 'test')

      sinon.replace(s3, 'send', (command: any) => {
        if (command.constructor.name === 'HeadObjectCommand') {
          return s3Reject(new Error('bad things'))
        }

        return s3Reject(new S3Error('UnknownCommand'))
      })

      await expect(store.open()).to.eventually.rejected
        .with.property('code', 'ERR_DB_OPEN_FAILED')
    })
  })

  describe('interface-datastore', () => {
    interfaceDatastoreTests({
      setup () {
        const s3 = s3Mock(new S3({ region: 'REGION' }))

        return new S3Datastore(s3, 'test')
      },
      teardown () {
      }
    })
  })
})
