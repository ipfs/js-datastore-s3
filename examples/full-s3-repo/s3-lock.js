'use strict'

const PATH = require('path')
const { fromString: uint8ArrayFromString } = require('uint8arrays')

/**
 * Uses an object in an S3 bucket as a lock to signal that an IPFS repo is in use.
 * When the object exists, the repo is in use. You would normally use this to make
 * sure multiple IPFS nodes don’t use the same S3 bucket as a datastore at the same time.
 */

/**
 * @typedef {import('ipfs-repo').LockCloser} LockCloser
 */

class S3Lock {
  /**
   * @param {import('aws-sdk/clients/s3')} s3
   */
  constructor (s3) {
    this.s3 = s3

    const {
      config: {
        params: {
          Bucket
        } = {}
      } = {}
    } = s3

    if (typeof Bucket !== 'string') {
      throw new Error('An S3 instance with a predefined Bucket must be supplied. See the datastore-s3 README for examples.')
    }

    this.bucket = Bucket
  }

  /**
   * Returns the location of the lock file given the path it should be located at
   *
   * @private
   * @param {string} dir
   * @returns {string}
   */
  getLockfilePath (dir) {
    return PATH.join(dir, 'repo.lock')
  }

  /**
   * Creates the lock. This can be overridden to customize where the lock should be created
   *
   * @param {string} dir
   * @returns {Promise<LockCloser>}
   */
  async lock (dir) {
    const lockPath = this.getLockfilePath(dir)

    let alreadyLocked, err
    try {
      alreadyLocked = await this.locked(dir)
    } catch (e) {
      err = e
    }
    if (err || alreadyLocked) {
      throw new Error('The repo is already locked')
    }

    // There's no lock yet, create one
    await this.s3.putObject({
      Bucket: this.bucket,
      Key: lockPath,
      Body: uint8ArrayFromString('')
    }).promise()

    return this.getCloser(lockPath)
  }

  /**
   * Returns a LockCloser, which has a `close` method for removing the lock located at `lockPath`
   *
   * @param {string} lockPath
   * @returns {LockCloser}
   */
  getCloser (lockPath) {
    const closer = {
      /**
       * Removes the lock. This can be overridden to customize how the lock is removed. This
       * is important for removing any created locks.
       */
      close: async () => {
        try {
          await this.s3.deleteObject({
            Bucket: this.bucket,
            Key: lockPath
          }).promise()
        } catch (err) {
          if (err.statusCode !== 404) {
            throw err
          }
        }
      }
    }

    /**
     * @param {Error} [err]
     */
    const cleanup = async (err) => {
      if (err instanceof Error) {
        console.log('\nAn Uncaught Exception Occurred:\n', err)
      } else if (err) {
        console.log('\nReceived a shutdown signal:', err)
      }

      console.log('\nAttempting to cleanup gracefully...')

      try {
        await closer.close()
      } catch (e) {
        console.log('Caught error cleaning up: %s', e.message)
      }
      console.log('Cleanup complete, exiting.')
      process.exit()
    }

    // listen for graceful termination
    process.on('SIGTERM', cleanup)
    process.on('SIGINT', cleanup)
    process.on('SIGHUP', cleanup)
    process.on('uncaughtException', cleanup)

    return closer
  }

  /**
   * Calls back on whether or not a lock exists. Override this method to customize how the check is made.
   *
   * @param {string} dir
   * @returns {Promise<boolean>}
   */
  async locked (dir) {
    try {
      await this.s3.getObject({
        Bucket: this.bucket,
        Key: this.getLockfilePath(dir)
      }).promise()
    } catch (err) {
      if (err.code === 'ERR_NOT_FOUND') {
        return false
      }
      throw err
    }

    return true
  }
}

module.exports = S3Lock
