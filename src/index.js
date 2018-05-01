/* @flow */
'use strict'

/* :: import type {Batch, Query, QueryResult, Callback} from 'interface-datastore' */
const assert = require('assert')
const path = require('upath')
const setImmediate = require('async/setImmediate')
const each = require('async/each')
const waterfall = require('async/series')
const asyncFilter = require('interface-datastore').utils.asyncFilter
const asyncSort = require('interface-datastore').utils.asyncSort
const Key = require('interface-datastore').Key

const Deferred = require('pull-defer')
const pull = require('pull-stream')

/* :: export type S3DSInputOptions = {
  s3: S3Instance,
  createIfMissing: ?boolean
}

declare type S3Instance = {
  config: {
    params: {
      Bucket: ?string
    }
  },
  deleteObject: any,
  getObject: any,
  headBucket: any,
  headObject: any,
  listObjectsV2: any,
  upload: any
}
*/

/**
 * A datastore backed by the file system.
 *
 * Keys need to be sanitized before use, as they are written
 * to the file system as is.
 */
class S3Datastore {
  /* :: path: string */
  /* :: opts: S3DSInputOptions */
  /* :: bucket: string */
  /* :: createIfMissing: boolean */

  constructor (path /* : string */, opts /* : S3DSInputOptions */) {
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

    assert(typeof Bucket === 'string', 'An S3 instance with a predefined Bucket must be supplied. See the datastore-s3 README for examples.')
    assert(typeof createIfMissing === 'boolean', `createIfMissing must be a boolean but was (${typeof createIfMissing}) ${createIfMissing}`)
    this.bucket = Bucket
    this.createIfMissing = createIfMissing
  }

  /**
   * Returns the full key which includes the path to the ipfs store
   * @param {Key} key
   * @returns {String}
   */
  _getFullKey (key /* : Key */) {
    // Avoid absolute paths with s3
    return path.join('.', this.path, key.toString())
  }

  /**
   * Store the given value under the key.
   *
   * @param {Key} key
   * @param {Buffer} val
   * @param {function(Error)} callback
   * @returns {void}
   */
  put (key /* : Key */, val /* : Buffer */, callback /* : Callback<void> */) /* : void */ {
    this.opts.s3.upload({
      Key: this._getFullKey(key),
      Body: val
    }, (err, data) => {
      if (err && err.code === 'NoSuchBucket' && this.createIfMissing) {
        this.opts.s3.createBucket({}, (err) => {
          if (err) return callback(err)
          setImmediate(() => this.put(key, val, callback))
        })
      } else {
        callback(err)
      }
    })
  }

  /**
   * Read from s3.
   *
   * @param {Key} key
   * @param {function(Error, Buffer)} callback
   * @returns {void}
   */
  get (key /* : Key */, callback /* : Callback<Buffer> */) /* : void */ {
    this.opts.s3.getObject({
      Key: this._getFullKey(key)
    }, (err, data) => {
      if (err && err.statusCode === 404) {
        // TODO: Cleanup across repos https://github.com/ipfs/js-ipfs/blob/master/src/core/boot.js#L43
        return callback(new Error('not found'))
      } else if (err) {
        return callback(err)
      }

      // If a body was returned, ensure it's a Buffer
      callback(null, data.Body ? Buffer.from(data.Body) : null)
    })
  }

  /**
   * Check for the existence of the given key.
   *
   * @param {Key} key
   * @param {function(Error, bool)} callback
   * @returns {void}
   */
  has (key /* : Key */, callback /* : Callback<bool> */) /* : void */ {
    this.opts.s3.headObject({
      Key: this._getFullKey(key)
    }, (err, data) => {
      if (err && err.code === 'NotFound') {
        return callback(null, false)
      } else if (err) {
        return callback(err, false)
      }

      callback(null, true)
    })
  }

  /**
   * Delete the record under the given key.
   *
   * @param {Key} key
   * @param {function(Error)} callback
   * @returns {void}
   */
  delete (key /* : Key */, callback /* : Callback<void> */) /* : void */ {
    this.opts.s3.deleteObject({
      Key: this._getFullKey(key)
    }, (err, data) => {
      callback(err)
    })
  }

  /**
   * Create a new batch object.
   *
   * @returns {Batch}
   */
  batch () /* : Batch<Buffer> */ {
    let puts = []
    let deletes = []
    return {
      put (key /* : Key */, value /* : Buffer */) /* : void */ {
        puts.push({ key: key, value: value })
      },
      delete (key /* : Key */) /* : void */ {
        deletes.push(key)
      },
      commit: (callback /* : (err: ?Error) => void */) => {
        waterfall([
          (cb) => each(puts, (p, _cb) => {
            this.put(p.key, p.value, _cb)
          }, cb),
          (cb) => each(deletes, (key, _cb) => {
            this.delete(key, _cb)
          }, cb)
        ], (err) => callback(err))
      }
    }
  }

  /**
   * Recursively fetches all keys from s3
   * @param {Object} params
   * @param {Array<Key>} keys
   * @param {function} callback
   * @returns {void}
   */
  _listKeys (params /* : { Prefix: string, StartAfter: ?string } */, keys /* : Array<Key> */, callback /* : Callback<void> */) {
    if (typeof callback === 'undefined') {
      callback = keys
      keys = []
    }

    this.opts.s3.listObjectsV2(params, (err, data) => {
      if (err) {
        return callback(new Error(err.code))
      }

      data.Contents.forEach((d) => {
        // Remove the path from the key
        keys.push(new Key(d.Key.slice(this.path.length), false))
      })

      // If we didnt get all records, recursively query
      if (data.isTruncated) {
        // If NextMarker is absent, use the key from the last result
        params.StartAfter = data.Contents[data.Contents.length - 1].Key

        // recursively fetch keys
        return this._listKeys(params, keys, callback)
      }

      callback(err, keys)
    })
  }

  /**
   * Returns an iterator for fetching objects from s3 by their key
   * @param {Array<Key>} keys
   * @param {Boolean} keysOnly Whether or not only keys should be returned
   * @returns {Iterator}
   */
  _getS3Iterator (keys /* : Array<Key> */, keysOnly /* : boolean */) {
    let count = 0

    return {
      next: (callback/* : Callback<Error, Key, Buffer> */) => {
        // Check if we're done
        if (count >= keys.length) {
          return callback(null, null, null)
        }

        let currentKey = keys[count++]

        if (keysOnly) {
          return callback(null, currentKey, null)
        }

        // Fetch the object Buffer from s3
        this.get(currentKey, (err, data) => {
          callback(err, currentKey, data)
        })
      }
    }
  }

  /**
   * Query the store.
   *
   * @param {Object} q
   * @returns {PullStream}
   */
  query (q /* : Query<Buffer> */) /* : QueryResult<Buffer> */ {
    const prefix = path.join(this.path, q.prefix || '')

    let deferred = Deferred.source()
    let iterator

    const params /* : Object */ = {
      Prefix: prefix
    }

    // this gets called recursively, the internals need to iterate
    const rawStream = (end, callback) => {
      if (end) {
        return callback(end)
      }

      iterator.next((err, key, value) => {
        if (err) {
          return callback(err)
        }

        // If the iterator is done, declare the stream done
        if (err === null && key === null && value === null) {
          return callback(true) // eslint-disable-line standard/no-callback-literal
        }

        const res /* : Object */ = {
          key: key
        }

        if (value) {
          res.value = value
        }

        callback(null, res)
      })
    }

    // Get all the keys via list object, recursively as needed
    this._listKeys(params, [], (err, keys) => {
      if (err) {
        return deferred.abort(err)
      }

      iterator = this._getS3Iterator(keys, q.keysOnly || false)

      deferred.resolve(rawStream)
    })

    // Use a deferred pull stream source, as async operations need to occur before the
    // pull stream begins
    let tasks = [deferred]

    if (q.filters != null) {
      tasks = tasks.concat(q.filters.map(f => asyncFilter(f)))
    }

    if (q.orders != null) {
      tasks = tasks.concat(q.orders.map(o => asyncSort(o)))
    }

    if (q.offset != null) {
      let i = 0
      tasks.push(pull.filter(() => i++ >= q.offset))
    }

    if (q.limit != null) {
      tasks.push(pull.take(q.limit))
    }

    return pull.apply(null, tasks)
  }

  /**
   * This will check the s3 bucket to ensure access and existence
   *
   * @param {function(Error)} callback
   * @returns {void}
   */
  open (callback /* : Callback<void> */) /* : void */ {
    this.opts.s3.headObject({
      Key: this.path
    }, (err, data) => {
      if (err && err.statusCode === 404) {
        return this.put(new Key('/', false), Buffer.from(''), callback)
      }

      callback(err)
    })
  }

  /**
   * Close the store.
   *
   * @param {function(Error)} callback
   * @returns {void}
   */
  close (callback /* : (err: ?Error) => void */) /* : void */ {
    setImmediate(callback)
  }
}

module.exports = S3Datastore
