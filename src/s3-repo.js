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
 * @typedef {Object} S3Options
 * @property {string} bucket
 * @property {string} region
 * @property {string} accessKeyId
 * @property {string} secretAccessKey
 */

/**
 * @typedef {Object} RepoOptions
 * @property {string} path The path inside the bucket to create the repo
 * @property {boolean} createIfMissing If the repo should be created if it's missing
 * @property {RepoLock} lock An optional lock for the repo
 */

/**
 * A convenience method for creating an S3 backed IPFS repo
 * @param {S3Store} S3Store
 * @param {RepoOptions} options
 * @param {S3Options} s3Options
 * @returns {IPFSRepo}
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
    createIfMissing
  }

  // If no lock is given, create a mock lock
  lock = lock || notALock

  return new IPFSRepo(path, {
    storageBackends: {
      root: S3Store,
      blocks: S3Store,
      keys: S3Store,
      datastore: S3Store
    },
    storageBackendOptions: {
      root: storeConfig,
      blocks: storeConfig,
      keys: storeConfig,
      datastore: storeConfig
    },
    lock: lock
  })
}

module.exports = createRepo
