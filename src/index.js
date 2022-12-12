import { Buffer } from 'buffer'
import filter from 'it-filter'
import { Key } from 'interface-datastore'
import { BaseDatastore } from 'datastore-core/base'
import * as Errors from 'datastore-core/errors'
import { fromString as unint8arrayFromString } from 'uint8arrays'
import toBuffer from 'it-to-buffer'
import {
  PutObjectCommand,
  CreateBucketCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command
} from '@aws-sdk/client-s3'

/**
 * @typedef {import('interface-datastore').Pair} Pair
 * @typedef {import('interface-datastore').Query} Query
 * @typedef {import('interface-datastore').KeyQuery} KeyQuery
 * @typedef {import('interface-datastore').Options} Options
 * @typedef {import('interface-datastore').Batch} Batch
 */

/**
 * A datastore backed by the file system.
 *
 * Keys need to be sanitized before use, as they are written
 * to the file system as is.
 */
export class S3Datastore extends BaseDatastore {
  /**
   * @param {string} path
   * @param {import('./types').S3DatastoreOptions} opts
   */
  constructor(path, opts) {
    super()

    this.path = path
    this.opts = opts
    const { createIfMissing = false, bucket } = opts

    if (typeof bucket !== 'string') {
      throw new Error(
        'An S3 instance with a predefined Bucket must be supplied. See the datastore-s3 README for examples.'
      )
    }
    if (typeof createIfMissing !== 'boolean') {
      throw new Error(
        `createIfMissing must be a boolean but was (${typeof createIfMissing}) ${createIfMissing}`
      )
    }
    this.bucket = bucket
    this.createIfMissing = createIfMissing
  }

  /**
   * Returns the full key which includes the path to the ipfs store
   *
   * @param {Key} key
   * @returns {string}
   */
  _getFullKey(key) {
    // Avoid absolute paths with s3
    return [this.path, key.toString()].join('/').replace(/\/\/+/g, '/')
  }

  /**
   * Store the given value under the key.
   *
   * @param {Key} key
   * @param {Uint8Array} val
   * @returns {Promise<void>}
   */
  async put(key, val) {
    try {
      await this.opts.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: this._getFullKey(key),
          Body: Buffer.from(val, val.byteOffset, val.byteLength)
        })
      )
    } catch (/** @type {any} */ err) {
      if (err.code === 'NoSuchBucket' && this.createIfMissing) {
        await this.opts.s3.send(
          new CreateBucketCommand({
            Bucket: this.bucket
          })
        )
        return this.put(key, val)
      }
      throw Errors.dbWriteFailedError(err)
    }
  }

  /**
   * Read from s3.
   *
   * @param {Key} key
   * @returns {Promise<Uint8Array>}
   */
  async get(key) {
    try {
      const data = await this.opts.s3.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: this._getFullKey(key)
        })
      )

      if (!data.Body) {
        throw new Error('Response had no body')
      }

      // For browser fetch API that don't support request.body
      /*if (data.Body instanceof Blob) {
        const buf = await data.Body.arrayBuffer()

        return new Uint8Array(buf, 0, buf.byteLength)
      }*/

      // NodeJS >= 17.5.0
      return Buffer.concat(await data.Body.toArray())
    } catch (/** @type {any} */ err) {
      if (err.Code === 'NoSuchKey') {
        throw Errors.notFoundError(err)
      }
      throw err
    }
  }

  /**
   * Check for the existence of the given key.
   *
   * @param {Key} key
   */
  async has(key) {
    try {
      await this.opts.s3.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: this._getFullKey(key)
        })
      )
      return true
    } catch (/** @type {any} */ err) {
      if (err.$metadata.httpStatusCode === 404) {
        return false
      }
      throw err
    }
  }

  /**
   * Delete the record under the given key.
   *
   * @param {Key} key
   */
  async delete(key) {
    try {
      await this.opts.s3.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: this._getFullKey(key)
        })
      )
    } catch (/** @type {any} */ err) {
      throw Errors.dbDeleteFailedError(err)
    }
  }

  /**
   * Create a new batch object.
   *
   * @returns {Batch}
   */
  batch() {
    /** @type {({ key: Key, value: Uint8Array })[]} */
    const puts = []
    /** @type {Key[]} */
    const deletes = []
    return {
      put(key, value) {
        puts.push({ key: key, value: value })
      },
      delete(key) {
        deletes.push(key)
      },
      commit: async () => {
        const putOps = puts.map((p) => this.put(p.key, p.value))
        const delOps = deletes.map((key) => this.delete(key))
        await Promise.all(putOps.concat(delOps))
      }
    }
  }

  /**
   * Recursively fetches all keys from s3
   *
   * @param {{ Prefix?: string, StartAfter?: string }} params
   * @param {Options} [options]
   * @returns {AsyncGenerator<Key, void, undefined>}
   */
  async *_listKeys(params, options) {
    try {
      const data = await this.opts.s3.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          ...params
        })
      )

      if (options && options.signal && options.signal.aborted) {
        return
      }

      if (!data || !data.Contents) {
        throw new Error('Not found')
      }

      for (const d of data.Contents) {
        if (!d.Key) {
          throw new Error('Not found')
        }

        // Remove the path from the key
        yield new Key(d.Key.slice(this.path.length), false)
      }

      // If we didn't get all records, recursively query
      if (data.IsTruncated) {
        // If NextMarker is absent, use the key from the last result
        params.StartAfter = data.Contents[data.Contents.length - 1].Key

        // recursively fetch keys
        yield* this._listKeys(params)
      }
    } catch (/** @type {any} */ err) {
      throw new Error(err.code)
    }
  }

  /**
   * @param {Query} q
   * @param {Options} [options]
   */
  async *_all(q, options) {
    for await (const key of this._allKeys({ prefix: q.prefix }, options)) {
      try {
        /** @type {Pair} */
        const res = {
          key,
          value: await this.get(key)
        }

        yield res
      } catch (/** @type {any} */ err) {
        // key was deleted while we are iterating over the results
        if (err.statusCode !== 404) {
          throw err
        }
      }
    }
  }

  /**
   * @param {KeyQuery} q
   * @param {Options} [options]
   * @returns {AsyncGenerator<Key, void, undefined>}
   */
  async *_allKeys(q, options) {
    const prefix = [this.path, q.prefix || ''].join('/').replace(/\/\/+/g, '/')

    // Get all the keys via list object, recursively as needed
    let it = this._listKeys(
      {
        Prefix: prefix
      },
      options
    )

    if (q.prefix != null) {
      it = filter(it, (k) => k.toString().startsWith(`${q.prefix || ''}`))
    }

    yield* it
  }

  /**
   * This will check the s3 bucket to ensure access and existence
   */
  async open() {
    try {
      await this.opts.s3.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: this.path
        })
      )
    } catch (/** @type {any} */ err) {
      if (err.$metadata.httpStatusCode !== 404) {
        throw Errors.dbOpenFailedError(err)
      }
    }
  }

  async close() {}
}
