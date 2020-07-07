'use strict'

const { Buffer } = require('buffer')

const cache = require('js-cache');

const {
  Adapter,
  Key,
  Errors,
  utils: {
    filter
  }
} = require('interface-datastore')
const createRepo = require('./s3-repo')

const DEFAULT_CACHE_TTL = 10000 // 10 seconds

const DEFAULT_404_CACHE_TTL = 2000 // 2 seconds

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
      cacheEnabled = false,
      cacheTTL = DEFAULT_CACHE_TTL,
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
    if (typeof cacheEnabled !== 'boolean') {
      throw new Error(`cacheEnabled must be a boolean but was (${typeof cacheEnabled}) ${cacheEnabled}`)
    }
    if (typeof cacheTTL !== 'number') {
      throw new Error(`cacheTTL must be a number but was (${typeof cacheTTL}) ${cacheTTL}`)
    }
    this.bucket = Bucket
    this.createIfMissing = createIfMissing
    this.cacheEnabled = cacheEnabled

    if (this.cacheEnabled) {
      this.cacheTTL = cacheTTL
      this.s3DataCache = new cache() // create cache for values
      this.s3HeadCache = new cache() // create cache for HEAD results
    }
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
   * @param {Buffer} val
   * @returns {Promise}
   */
  async put (key, val) {
    try {
      await this.opts.s3.upload({
        Key: this._getFullKey(key),
        Body: val
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
   * @returns {Promise<Buffer>}
   */
  async get (key) {
    let data = this.getFromCache(this.s3DataCache, key)
    if (data !== undefined) {
      return data
    }

    try {
      let data = await this.opts.s3.getObject({
        Key: this._getFullKey(key)
      }).promise()

      // If a body was returned, ensure it's a Buffer
      let result = data.Body ? Buffer.from(data.Body) : null
      this.putToCache(this.s3DataCache, key, result)
      return result
    } catch (err) {
      if (err.statusCode === 404) {
        const wrappedErr = Errors.notFoundError(err)
        this.putToCache(this.s3DataCache, key, wrappedErr, DEFAULT_404_CACHE_TTL)
        throw wrappedErr
      }
      throw err
    }
  }

  /**
   * Gets value stored in cache
   * @param cache - Cache instance
   * @param key - Key
   * @return {undefined|*}
   */
  getFromCache(cache, key) {
    if (!this.cacheEnabled) {
      return undefined
    }

    const data = cache.get(this._getFullKey(key))
    if (data !== undefined) {
      if (data instanceof Error) {
        throw data
      }
      return data
    }
  }

  /**
   * Puts value into cache
   * @param cache - Cache instance
   * @param key - Key
   * @param value - Value
   * @param ttl - Time to live
   */
  putToCache(cache, key, value, ttl) {
    if (!this.cacheEnabled) {
      return
    }

    const timeToLive = ttl? ttl : this.cacheTTL
    cache.set(this._getFullKey(key), value, timeToLive)
  }

  /**
   * Deletes value from cache
   * @param cache - Cache instance
   * @param key - Key
   */
  delFromCache(cache, key) {
    if (!this.cacheEnabled) {
      return
    }
    cache.del(key)
  }

  /**
   * Check for the existence of the given key.
   *
   * @param {Key} key
   * @returns {Promise<bool>}
   */
  async has (key) {
    const result = this.getFromCache(this.s3HeadCache, key)
    if (result !== undefined) {
      return result
    }

    try {
      await this.opts.s3.headObject({
        Key: this._getFullKey(key)
      }).promise()

      this.putToCache(this.s3HeadCache, key, true)
      return true
    } catch (err) {
      if (err.code === 'NotFound') {
        this.putToCache(this.s3HeadCache, key, false)
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
      if (this.cacheEnabled) {
        this.delFromCache(this.s3DataCache, key)
        this.delFromCache(this.s3HeadCache, key)
      }

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
      const res = { key }
      if (values) {
        // Fetch the object Buffer from s3
        res.value = await this.get(key)
      }

      yield res
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
        return this.put(new Key('/', false), Buffer.from(''))
      }

      throw Errors.dbOpenFailedError(err)
    }
  }
}

module.exports = S3Datastore
module.exports.createRepo = (...args) => {
  return createRepo(S3Datastore, ...args)
}
