/* @flow */
'use strict'

/* :: import type {Batch, Query, QueryResult, Callback} from 'interface-datastore' */
const path = require('path')
const setImmediate = require('async/setImmediate')
const each = require('async/each')
const waterfall = require('async/series')
const asyncFilter = require('interface-datastore').utils.asyncFilter
const asyncSort = require('interface-datastore').utils.asyncSort
const Key = require('interface-datastore').Key

const Deferred = require('pull-defer')

/* :: export type S3DSInputOptions = {
  s3: S3Instance
}

declare type S3Instance = {
  config: {
    Bucket: ?string
  }
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

  constructor (path /* : string */, opts /* : S3DSInputOptions */) {
    this.path = path
    this.opts = opts

    try {
      if (typeof this.opts.s3.config.params.Bucket !== 'string') {
        throw new Error()
      }
    } catch (err) {
      throw new Error('An S3 instance with a predefined Bucket must be supplied. See the datastore-s3 README for examples')
    }

    this.bucket = this.opts.s3.config.params.Bucket
  }

  /**
   * Returns the full key which includes the path to the ipfs store
   * @param {Key} key 
   */
  _getFullKey (key /* : Key */) {
    return path.join(this.path, key.toString())
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
      callback(err)
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
      if (err) {
        callback(err, null)
        return
      }

      callback(null, data.Body || null)
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
        callback(null, false)
        return
      } else if (err) {
        callback(err, false)
        return
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
          }, cb),
        ], (err) => callback(err))
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

    let deferred = Deferred.source()
    let prefix = q.prefix
    let limit = q.limit || null
    let offset = q.offset || 0
    let filters = q.filters || []
    let orders = q.orders || []
    let keysOnly = q.keysOnly || false
    
    // List the objects from s3, with: prefix, limit, offset    

    // If !keyOnly get each object from s3

    // Filter the objects

    // Order the objects



    /*
    - `prefix: string` (optional) - only return values where the key starts with this prefix
    - `filters: Array<Filter<Value>>` (optional) - filter the results according to the these functions
    - `orders: Array<Order<Value>>` (optional) - order the results according to these functions
    - `limit: number` (optional) - only return this many records
    - `offset: number` (optional) - skip this many records at the beginning
    - `keysOnly: bool` (optional) - Only return keys, no values.
    */

   // I'll need to return a https://pull-stream.github.io/#pull-defer, since the query to s3 is async
    throw new Error('TODO')
    return deferred
  }

   /**
   * This will check the s3 bucket to ensure permissions are set
   * 
   * @param {function(Error)} callback 
   */
  open (callback /* : Callback<void> */) /* : void */ {
    this.opts.s3.headBucket({
      Bucket: this.bucket
    }, callback)
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
