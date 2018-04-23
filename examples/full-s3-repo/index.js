'use strict'

const series = require('async/series')
const IPFS = require('ipfs')
const Repo = require('ipfs-repo')
const S3 = require('aws-sdk').S3
const S3Store = require('../../src')
const S3Lock = require('./s3-lock')

// Initialize the AWS S3 instance
const s3 = new S3({
  params: {
    Bucket: 'my-bucket'
  },
  accessKeyId: 'myaccesskey',
  secretAccessKey: 'mysecretkey'
})

// Create our custom lock
const s3Store = new S3Store('/tmp/test/.ipfs', { s3 })
const s3Lock = new S3Lock(s3Store)

// Create the IPFS Repo, full backed by S3
const repo = new Repo('/tmp/test/.ipfs', {
  storageBackends: {
    root: S3Store,
    blocks: S3Store,
    keys: S3Store,
    datastore: S3Store
  },
  storageBackendOptions: {
    root: { s3 },
    blocks: { s3 },
    keys: { s3 },
    datastore: { s3 }
  },
  lock: s3Lock
})

// Create a new IPFS node with our S3 backed Repo
let node = new IPFS({
  repo
})

// Test out the repo by sending and fetching some data
node.on('ready', () => {
  console.log('Ready')
  node.version()
    .then((version) => {
      console.log('Version:', version.version)
    })
    // Once we have the version, let's add a file to IPFS
    .then(() => {
      return node.files.add({
        path: 'hello.txt',
        content: Buffer.from('Hello World 101')
      })
    })
    // Log out the added files metadata and cat the file from IPFS
    .then((filesAdded) => {
      console.log('\nAdded file:', filesAdded[0].path, filesAdded[0].hash)
      return node.files.cat(filesAdded[0].hash)
    })
    // Print out the files contents to console
    .then((data) => {
      console.log('\nFetched file content:')
      process.stdout.write(data)
    })
    // Log out the error, if there is one
    .catch((err) => {
      console.log('File Processing Error:', err)
    })
    // After everything is done, shut the node down
    // We don't need to worry about catching errors here
    .then(() => {
      console.log('\n\nStopping the node')
      return node.stop()
    })
})
