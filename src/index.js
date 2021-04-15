'use strict'

const { Buffer } = require('buffer')
const filter = require('it-filter')
const {
  Adapter,
  Key,
  Errors
} = require('interface-datastore')

/**
 * @typedef {import('interface-datastore').Pair} Pair
 * @typedef {import('interface-datastore').Query} Query
 * @typedef {import('interface-datastore').KeyQuery} KeyQuery
 * @typedef {import('interface-datastore').Options} Options
 */

/**
 * A datastore backed by the file system.
 *
 * Keys need to be sanitized before use, as they are written
 * to the file system as is.
 */
class S3Datastore extends Adapter {
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
   * @returns {Promise}
   */
  async put (key, val) {
    try {
      await this.opts.s3.upload({
        Key: this._getFullKey(key),
        Body: Buffer.from(val, val.byteOffset, val.byteLength)
      }).promise()
    } catch (err) {
      if (err.code === 'NoSuchBucket' && this.createIfMissing) {
        await this.opts.s3.createBucket({}).promise()
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
        Key: this._getFullKey(key)
      }).promise()

      // If a body was returned, ensure it's a Uint8Array
      if (ArrayBuffer.isView(data.Body)) {
        if (data.Body instanceof Uint8Array) {
          return data.Body
        }

        return Uint8Array.from(data.Body, data.Body.byteOffset, data.Body.byteLength)
      }

      return data.Body || null
    } catch (err) {
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
   * @returns {Promise<bool>}
   */
  async has (key) {
    try {
      await this.opts.s3.headObject({
        Key: this._getFullKey(key)
      }).promise()
      return true
    } catch (err) {
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
   * @returns {Promise}
   */
  async delete (key) {
    try {
      await this.opts.s3.deleteObject({
        Key: this._getFullKey(key)
      }).promise()
    } catch (err) {
      throw Errors.dbDeleteFailedError(err)
    }
  }

  /**
   * Create a new batch object.
   *
   * @returns {Batch}
   */
  batch () {
    const puts = []
    const deletes = []
    return {
      put (key, value) {
        puts.push({ key: key, value: value })
      },
      delete (key) {
        deletes.push(key)
      },
      commit: () => {
        const putOps = puts.map((p) => this.put(p.key, p.value))
        const delOps = deletes.map((key) => this.delete(key))
        return Promise.all(putOps.concat(delOps))
      }
    }
  }

  /**
   * Recursively fetches all keys from s3
   *
   * @param {Object} params
   * @param {Options} [options]
   * @returns {AsyncIterator<Key>}
   */
  async * _listKeys (params, options) {
    let data
    try {
      data = await this.opts.s3.listObjectsV2(params).promise()
    } catch (err) {
      throw new Error(err.code)
    }

    if (options && options.signal && options.signal.aborted) {
      return
    }

    for (const d of data.Contents) {
      // Remove the path from the key
      yield new Key(d.Key.slice(this.path.length), false)
    }

    // If we didn't get all records, recursively query
    if (data.isTruncated) {
      // If NextMarker is absent, use the key from the last result
      params.StartAfter = data.Contents[data.Contents.length - 1].Key

      // recursively fetch keys
      yield * this._listKeys(params)
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
      } catch (err) {
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
   */
  async * _allKeys (q, options) {
    const prefix = [this.path, q.prefix || ''].join('/').replace(/\/\/+/g, '/')

    // Get all the keys via list object, recursively as needed
    let it = this._listKeys({
      Prefix: prefix
    }, options)

    if (q.prefix != null) {
      it = filter(it, k => k.toString().startsWith(q.prefix))
    }

    yield * it
  }

  /**
   * This will check the s3 bucket to ensure access and existence
   *
   * @returns {Promise}
   */
  async open () {
    try {
      await this.opts.s3.headObject({
        Key: this.path
      }).promise()
    } catch (err) {
      if (err.statusCode !== 404) {
        throw Errors.dbOpenFailedError(err)
      }
    }
  }

  close () {}
}

module.exports = S3Datastore
