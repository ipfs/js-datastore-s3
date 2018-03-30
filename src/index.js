/* @flow */
'use strict'

/* :: import type {Batch, Query, QueryResult, Callback} from 'interface-datastore' */

const asyncFilter = require('interface-datastore').utils.asyncFilter
const asyncSort = require('interface-datastore').utils.asyncSort
const Key = require('interface-datastore').Key

/* :: export type FsInputOptions = {
  createIfMissing?: bool,
  errorIfExists?: bool,
  extension?: string
}

type FsOptions = {
  createIfMissing: bool,
  errorIfExists: bool,
  extension: string
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
  /* :: opts: FsOptions */

  constructor (location /* : string */, opts /* : ?FsInputOptions */) {

  }

  open (callback /* : Callback<void> */) /* : void */ {

  }

  /**
   * Check if the path actually exists.
   * @private
   * @returns {void}
   */
  _open () {

  }

  /**
   * Create the directory to hold our data.
   *
   * @private
   * @returns {void}
   */
  _create () {

  }

  /**
   * Tries to open, and creates if the open fails.
   *
   * @private
   * @returns {void}
   */
  _openOrCreate () {

  }

  /**
   * Calculate the directory and file name for a given key.
   *
   * @private
   * @param {Key} key
   * @returns {{string, string}}
   */
  _encode (key /* : Key */) /* : {dir: string, file: string} */ {

  }

  /**
   * Calculate the original key, given the file name.
   *
   * @private
   * @param {string} file
   * @returns {Key}
   */
  _decode (file /* : string */) /* : Key */ {

  }

  /**
   * Write to the file system without extension.
   *
   * @param {Key} key
   * @param {Buffer} val
   * @param {function(Error)} callback
   * @returns {void}
   */
  putRaw (key /* : Key */, val /* : Buffer */, callback /* : Callback<void> */) /* : void */ {

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

  }

  /**
   * Read from the file system without extension.
   *
   * @param {Key} key
   * @param {function(Error, Buffer)} callback
   * @returns {void}
   */
  getRaw (key /* : Key */, callback /* : Callback<Buffer> */) /* : void */ {

  }

  /**
   * Read from the file system.
   *
   * @param {Key} key
   * @param {function(Error, Buffer)} callback
   * @returns {void}
   */
  get (key /* : Key */, callback /* : Callback<Buffer> */) /* : void */ {

  }

  /**
   * Check for the existence of the given key.
   *
   * @param {Key} key
   * @param {function(Error, bool)} callback
   * @returns {void}
   */
  has (key /* : Key */, callback /* : Callback<bool> */) /* : void */ {

  }

  /**
   * Delete the record under the given key.
   *
   * @param {Key} key
   * @param {function(Error)} callback
   * @returns {void}
   */
  delete (key /* : Key */, callback /* : Callback<void> */) /* : void */ {

  }

  /**
   * Create a new batch object.
   *
   * @returns {Batch}
   */
  batch () /* : Batch<Buffer> */ {
   
  }

  /**
   * Query the store.
   *
   * @param {Object} q
   * @returns {PullStream}
   */
  query (q /* : Query<Buffer> */) /* : QueryResult<Buffer> */ {
    
  }

  /**
   * Close the store.
   *
   * @param {function(Error)} callback
   * @returns {void}
   */
  close (callback /* : (err: ?Error) => void */) /* : void */ {

  }
}

module.exports = S3Datastore
