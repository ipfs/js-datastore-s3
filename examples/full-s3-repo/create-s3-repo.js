'use strict'

const S3 = require('aws-sdk/clients/s3')
const IPFSRepo = require('ipfs-repo')

// A mock lock
const notALock = {
  getLockfilePath: () => {},
  lock: (_) => notALock.getCloser(),
  getCloser: (_) => ({
    close: () => {}
  }),
  locked: (_) => false
}

/**
 * A convenience method for creating an S3 backed IPFS repo
 *
 * @param {Object} S3Store
 * @param {Object} options
 * @param {Object} s3Options
 * @returns {Object}
 */
const createRepo = (S3Store, options, s3Options) => {
  const {
    bucket,
    region,
    accessKeyId,
    secretAccessKey
  } = s3Options

  let {
    path,
    createIfMissing,
    lock
  } = options

  const storeConfig = {
    s3: new S3({
      params: {
        Bucket: bucket
      },
      region,
      accessKeyId,
      secretAccessKey
    }),
    createIfMissing,
    sharding: true
  }

  // If no lock is given, create a mock lock
  lock = lock || notALock

  return new IPFSRepo(path, {
    storageBackends: {
      root: S3Store,
      blocks: S3Store,
      keys: S3Store,
      datastore: S3Store,
      pins: S3Store
    },
    storageBackendOptions: {
      root: storeConfig,
      blocks: storeConfig,
      keys: storeConfig,
      datastore: storeConfig,
      pins: storeConfig
    },
    lock: lock
  })
}

module.exports = createRepo
