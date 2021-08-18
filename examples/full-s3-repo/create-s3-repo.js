'use strict'


const DatastoreS3 = require('datastore-s3')
const { createRepo } = require('ipfs-repo')
const BlockstoreDatastoreAdapter = require('blockstore-datastore-adapter')
const { ShardingDatastore, shard: { NextToLast } } = require('datastore-core')
const { codecs: { raw, json } } = require('multiformats/basics')
const dagPb = require('@ipld/dag-pb')
const dagCbor = require('@ipld/dag-cbor')

/**
 * A convenience method for creating an S3 backed IPFS repo
 *
 * @param {string} path
 * @param {import('aws-sdk/clients/s3')} s3
 * @param {import('ipfs-repo').RepoLock} repoLock
 */
const createS3Repo = (path, s3, repoLock) => {
  const storeConfig = {
    s3,
    createIfMissing: true
  }

  // These are the codecs we want to support, you may wish to add others
  const codecs = {
    [raw.code]: raw,
    [raw.name]: raw,
    [json.code]: json,
    [json.name]: json,
    [dagPb.code]: dagPb,
    [dagPb.name]: dagPb,
    [dagCbor.code]: dagCbor,
    [dagCbor.name]: dagCbor
  }

  /**
   * @type {import('ipfs-repo/src/types').loadCodec}
   */
  const loadCodec = async (codeOrName) => {
    if (codecs[codeOrName]) {
      return codecs[codeOrName]
    }

    throw new Error(`Unsupported codec ${codeOrName}`)
  }

  return createRepo(path, loadCodec, {
    root: new ShardingDatastore(
      new DatastoreS3(path, storeConfig),
      new NextToLast(2)
    ),
    blocks: new BlockstoreDatastoreAdapter(
      new ShardingDatastore(
        new DatastoreS3(`${path}blocks`, storeConfig),
        new NextToLast(2)
      )
    ),
    datastore: new ShardingDatastore(
      new DatastoreS3(`${path}datastore`, storeConfig),
      new NextToLast(2)
    ),
    keys: new ShardingDatastore(
      new DatastoreS3(`${path}keys`, storeConfig),
      new NextToLast(2)
    ),
    pins: new ShardingDatastore(
      new DatastoreS3(`${path}pins`, storeConfig),
      new NextToLast(2)
    )
  }, {
    repoLock
  })
}

module.exports = createS3Repo
