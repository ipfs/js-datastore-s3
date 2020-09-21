'use strict'

const { Buffer } = require('buffer')

const {
  Adapter,
  Key,
  Errors,
  utils: {
    filter
  }
} = require('interface-datastore')
const createRepo = require('./s3-repo')

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
   * @param {Key} key
   * @returns {String}
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
   * @param {Object} params
   * @returns {Iterator<Key>}
   */
  async * _listKeys (params) {
    let data
    try {
      data = await this.opts.s3.listObjectsV2(params).promise()
    } catch (err) {
      throw new Error(err.code)
    }

    for (const d of data.Contents) {
      // Remove the path from the key
      yield new Key(d.Key.slice(this.path.length), false)
    }

    // If we didnt get all records, recursively query
    if (data.isTruncated) {
      // If NextMarker is absent, use the key from the last result
      params.StartAfter = data.Contents[data.Contents.length - 1].Key

      // recursively fetch keys
      yield * this._listKeys(params)
    }
  }

  async * _all (q, options) {
    const prefix = [this.path, q.prefix || ''].join('/').replace(/\/\/+/g, '/')

    let values = true
    if (q.keysOnly != null) {
      values = !q.keysOnly
    }

    // Get all the keys via list object, recursively as needed
    const params = {
      Prefix: prefix
    }
    let it = this._listKeys(params)

    if (q.prefix != null) {
      it = filter(it, k => k.toString().startsWith(q.prefix))
    }

    for await (const key of it) {
      try {
        const res = { key }

        if (values) {
          // Fetch the object Buffer from s3
          res.value = await this.get(key)
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
      if (err.statusCode === 404) {
        return this.put(new Key('/', false), Uint8Array.from(''))
      }

      throw Errors.dbOpenFailedError(err)
    }
  }
}

module.exports = S3Datastore
module.exports.createRepo = (...args) => {
  return createRepo(S3Datastore, ...args)
}
