import { Buffer } from 'buffer'
import filter from 'it-filter'
import { Key } from 'interface-datastore'
import { BaseDatastore } from 'datastore-core/base'
import * as Errors from 'datastore-core/errors'
import { fromString as unint8arrayFromString } from 'uint8arrays'
import toBuffer from 'it-to-buffer'

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
  constructor (path, opts) {
    super()

    this.path = path
    this.opts = opts
    const {
      createIfMissing = false,
      s3: {
        config: {
          params: {
            Bucket
          } = {}
        } = {}
      } = {}
    } = opts

    if (typeof Bucket !== 'string') {
      throw new Error('An S3 instance with a predefined Bucket must be supplied. See the datastore-s3 README for examples.')
    }
    if (typeof createIfMissing !== 'boolean') {
      throw new Error(`createIfMissing must be a boolean but was (${typeof createIfMissing}) ${createIfMissing}`)
    }
    this.bucket = Bucket
    this.createIfMissing = createIfMissing
  }

  /**
   * Returns the full key which includes the path to the ipfs store
   *
   * @param {Key} key
   * @returns {string}
   */
  _getFullKey (key) {
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
  async put (key, val) {
    try {
      await this.opts.s3.upload({
        Bucket: this.bucket,
        Key: this._getFullKey(key),
        Body: Buffer.from(val, val.byteOffset, val.byteLength)
      }).promise()
    } catch (/** @type {any} */ err) {
      if (err.code === 'NoSuchBucket' && this.createIfMissing) {
        await this.opts.s3.createBucket({
          Bucket: this.bucket
        }).promise()
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
  async get (key) {
    try {
      const data = await this.opts.s3.getObject({
        Bucket: this.bucket,
        Key: this._getFullKey(key)
      }).promise()

      if (!data.Body) {
        throw new Error('Response had no body')
      }

      // If a body was returned, ensure it's a Uint8Array
      if (data.Body instanceof Uint8Array) {
        return data.Body
      }

      if (typeof data.Body === 'string') {
        return unint8arrayFromString(data.Body)
      }

      if (data.Body instanceof Blob) {
        const buf = await data.Body.arrayBuffer()

        return new Uint8Array(buf, 0, buf.byteLength)
      }

      // @ts-ignore s3 types define their own Blob as an empty interface
      return await toBuffer(data.Body)
    } catch (/** @type {any} */ err) {
      if (err.statusCode === 404) {
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
  async has (key) {
    try {
      await this.opts.s3.headObject({
        Bucket: this.bucket,
        Key: this._getFullKey(key)
      }).promise()
      return true
    } catch (/** @type {any} */ err) {
      if (err.code === 'NotFound') {
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
  async delete (key) {
    try {
      await this.opts.s3.deleteObject({
        Bucket: this.bucket,
        Key: this._getFullKey(key)
      }).promise()
    } catch (/** @type {any} */ err) {
      throw Errors.dbDeleteFailedError(err)
    }
  }

  /**
   * Create a new batch object.
   *
   * @returns {Batch}
   */
  batch () {
    /** @type {({ key: Key, value: Uint8Array })[]} */
    const puts = []
    /** @type {Key[]} */
    const deletes = []
    return {
      put (key, value) {
        puts.push({ key: key, value: value })
      },
      delete (key) {
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
  async * _listKeys (params, options) {
    try {
      const data = await this.opts.s3.listObjectsV2({
        Bucket: this.bucket,
        ...params
      }).promise()

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
        yield * this._listKeys(params)
      }
    } catch (/** @type {any} */ err) {
      throw new Error(err.code)
    }
  }

  /**
   * @param {Query} q
   * @param {Options} [options]
   */
  async * _all (q, options) {
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
  async * _allKeys (q, options) {
    const prefix = [this.path, q.prefix || ''].join('/').replace(/\/\/+/g, '/')

    // Get all the keys via list object, recursively as needed
    let it = this._listKeys({
      Prefix: prefix
    }, options)

    if (q.prefix != null) {
      it = filter(it, k => k.toString().startsWith(`${q.prefix || ''}`))
    }

    yield * it
  }

  /**
   * This will check the s3 bucket to ensure access and existence
   */
  async open () {
    try {
      await this.opts.s3.headObject({
        Bucket: this.bucket,
        Key: this.path
      }).promise()
    } catch (/** @type {any} */ err) {
      if (err.statusCode !== 404) {
        throw Errors.dbOpenFailedError(err)
      }
    }
  }

  async close () {}
}
